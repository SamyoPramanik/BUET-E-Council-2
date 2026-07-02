const request = require('supertest');
const app = require('../index');
const db = require('../db');

describe('Auth Service Endpoints', () => {
    // Shared testing variables
    const testUser = {
        username: 'jestuser',
        email: 'jestuser@example.com',
        password: 'password123',
        location: 'Test City'
    };

    let sessionToken1 = '';
    let sessionToken2 = '';
    let sessionId1 = '';
    let sessionId2 = '';

    // Helper: Before tests, ensure clean state
    beforeAll(async () => {
        await db.query(`DELETE FROM users WHERE username = $1 OR email = $2`, [testUser.username, testUser.email]);
    });

    // Helper: After tests, clean up test records and safely close pool
    afterAll(async () => {
        await db.query(`DELETE FROM users WHERE username = $1 OR email = $2`, [testUser.username, testUser.email]);
        await db.query(`DELETE FROM sessions WHERE user_id = $1`, [testUser.id]);
        await db.pool.end();
    });

    describe('1. POST /api/auth/signup', () => {
        it('should successfully register a new user', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(testUser.username);
        });

        it('should fail registration with missing fields', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({ username: 'anotheruser' });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should fail registration with existing username/email', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send(testUser);

            expect(res.statusCode).toBe(409);
            expect(res.body.success).toBe(false);
        });
    });

    describe('2. POST /api/auth/signin', () => {
        it('should successfully authenticate and return an HttpOnly cookie', async () => {
            const res = await request(app)
                .post('/api/auth/signin')
                .send({
                    username: testUser.username,
                    password: testUser.password,
                    location: 'Device 1'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.token).toBeDefined();
            sessionId1 = res.body.data.session_id;

            // Verify the Set-Cookie header exists and contains HttpOnly
            const setCookie = res.headers['set-cookie'];
            expect(setCookie).toBeDefined();
            expect(setCookie[0]).toMatch(/session_token=/);
            expect(setCookie[0]).toMatch(/HttpOnly/);

            // Save cookie for authenticated requests
            sessionToken1 = setCookie[0].split(';')[0];
        });

        it('should allow authenticating a second time, recording multiple sessions', async () => {
            const res = await request(app)
                .post('/api/auth/signin')
                .send({
                    username: testUser.username,
                    password: testUser.password,
                    location: 'Device 2'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            sessionId2 = res.body.data.session_id;

            const setCookie = res.headers['set-cookie'];
            sessionToken2 = setCookie[0].split(';')[0];
        });

        it('should reject invalid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/signin')
                .send({
                    username: testUser.username,
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.error_code).toBe('INVALID_CREDENTIALS');
        });
    });

    describe('3. GET /api/auth/me', () => {
        it('should securely fetch user details using the cookie token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Cookie', sessionToken1);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(testUser.username);
        });

        it('should reject requests without a valid session cookie', async () => {
            const res = await request(app)
                .get('/api/auth/me');

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Access denied. No token provided.');
        });
    });

    describe('4. GET /api/auth/sessions', () => {
        it('should list all active sessions and mark the current one correctly', async () => {
            const res = await request(app)
                .get('/api/auth/sessions')
                .set('Cookie', sessionToken1);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const sessions = res.body.data.sessions;
            expect(sessions.length).toBeGreaterThanOrEqual(2); // Since we signed in twice minimum

            // Find current session vs other session
            const currentSession = sessions.find(s => s.is_current === true);
            const otherSession = sessions.find(s => s.is_current === false);

            expect(currentSession).toBeDefined();
            expect(currentSession.id).toBe(sessionId1);
            expect(otherSession).toBeDefined();
        });
    });

    describe('5. DELETE /api/auth/sessions/:sessionId', () => {
        it('should prevent terminating the current active session via DELETE', async () => {
            const res = await request(app)
                .delete(`/api/auth/sessions/${sessionId1}`)
                .set('Cookie', sessionToken1);

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toContain('Cannot remove current session');
        });

        it('should successfully terminate secondary remote sessions', async () => {
            const res = await request(app)
                .delete(`/api/auth/sessions/${sessionId2}`)
                .set('Cookie', sessionToken1);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Fetch sessions again, second session shouldn't be active
            const sessionsRes = await request(app)
                .get('/api/auth/sessions')
                .set('Cookie', sessionToken1);

            const activeSessionIDs = sessionsRes.body.data.sessions.map(s => s.id);
            expect(activeSessionIDs).not.toContain(sessionId2);
            expect(activeSessionIDs).toContain(sessionId1);
        });
    });

    describe('6. POST /api/auth/signout', () => {
        it('should successfully sign out from the current active session', async () => {
            const res = await request(app)
                .post('/api/auth/signout')
                .set('Cookie', sessionToken1); // Signout of Device 1

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Next requests should fail
            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Cookie', sessionToken1);

            expect(meRes.statusCode).toBe(401);
        });
    });

    describe('7. POST /api/auth/signout-all', () => {
        it('should sign out from across all active sessions', async () => {
            // Re-authenticate Device 1 quickly to test signout-all since we just logged it out
            const loginRes = await request(app)
                .post('/api/auth/signin')
                .send({
                    username: testUser.username,
                    password: testUser.password
                });
            const newSessionCookie = loginRes.headers['set-cookie'][0].split(';')[0];

            // Setup a 3rd mock session
            const loginRes3 = await request(app)
                .post('/api/auth/signin')
                .send({
                    username: testUser.username,
                    password: testUser.password
                });
            const newSessionCookie3 = loginRes3.headers['set-cookie'][0].split(';')[0];

            // Now perform Signout-All using the newest session
            const res = await request(app)
                .post('/api/auth/signout-all')
                .set('Cookie', newSessionCookie);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Old cookies should now be blocked
            const meRes3 = await request(app)
                .get('/api/auth/me')
                .set('Cookie', newSessionCookie3);

            expect(meRes3.statusCode).toBe(401);
        });
    });
});
