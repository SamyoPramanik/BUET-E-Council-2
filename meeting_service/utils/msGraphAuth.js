const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');

// Delegated (user-signed-in) OAuth against Microsoft's v2 endpoint, for the
// single shared Outlook mailbox used to send mail (see routes/msAuthRoutes.js).
// One admin connects it once; the refresh token then lets every subsequent
// send happen silently (see getValidAccessToken below), no repeat sign-in.
const TENANT = process.env.MS_TENANT_ID || 'common';
const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const REDIRECT_URI = process.env.MS_REDIRECT_URI;
const SCOPES = 'openid profile offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read';

const AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;

// Access tokens are refreshed this many ms before their real expiry, so a
// send never races a token that's about to lapse mid-request.
const REFRESH_SKEW_MS = 2 * 60 * 1000;

const ENCRYPTION_ALGO = 'aes-256-gcm';

const getEncryptionKey = () => {
    const raw = process.env.MS_TOKEN_ENCRYPTION_KEY;
    if (!raw) throw new Error('MS_TOKEN_ENCRYPTION_KEY is not configured');
    // sha256 turns any passphrase length into the 32 bytes aes-256 needs.
    return crypto.createHash('sha256').update(raw).digest();
};

const encrypt = (plaintext) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
};

const decrypt = (payload) => {
    const buf = Buffer.from(payload, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
};

const isConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET && REDIRECT_URI);

const getAuthorizationUrl = (state) => {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        response_mode: 'query',
        scope: SCOPES,
        state,
        prompt: 'select_account',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
};

const requestToken = async (bodyParams) => {
    const { data } = await axios.post(TOKEN_URL, new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        ...bodyParams,
    }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data; // { access_token, refresh_token, expires_in, ... }
};

const exchangeCodeForTokens = (code) => requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
});

const refreshTokens = (refreshToken) => requestToken({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: SCOPES,
});

const fetchAccountEmail = async (accessToken) => {
    const { data } = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.mail || data.userPrincipalName;
};

// Upserts the singleton row (id = 1): connecting again just replaces it.
const saveConnection = async ({ accountEmail, accessToken, refreshToken, expiresIn, connectedBy }) => {
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await db.query(
        `INSERT INTO ms_oauth_connection (id, account_email, access_token, refresh_token, expires_at, connected_by, connected_at, updated_at)
         VALUES (1, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           account_email = EXCLUDED.account_email,
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           connected_by = EXCLUDED.connected_by,
           connected_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP`,
        [accountEmail, encrypt(accessToken), encrypt(refreshToken), expiresAt, connectedBy || null]
    );
};

const getConnection = async () => {
    const result = await db.query('SELECT * FROM ms_oauth_connection WHERE id = 1');
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
        accountEmail: row.account_email,
        accessToken: decrypt(row.access_token),
        refreshToken: decrypt(row.refresh_token),
        expiresAt: row.expires_at,
        connectedBy: row.connected_by,
        connectedAt: row.connected_at,
    };
};

const disconnectAccount = async () => {
    await db.query('DELETE FROM ms_oauth_connection WHERE id = 1');
};

// Returns a valid access token for the connected mailbox, refreshing it
// first if it's expired (or close to it). Returns null if nothing is
// connected, so callers can fall back to SMTP.
const getValidAccessToken = async () => {
    const connection = await getConnection();
    if (!connection) return null;

    const expiresInMs = new Date(connection.expiresAt).getTime() - Date.now();
    if (expiresInMs > REFRESH_SKEW_MS) {
        return connection.accessToken;
    }

    const tokens = await refreshTokens(connection.refreshToken);
    await saveConnection({
        accountEmail: connection.accountEmail,
        accessToken: tokens.access_token,
        // Microsoft may or may not rotate the refresh token; keep the old one if not.
        refreshToken: tokens.refresh_token || connection.refreshToken,
        expiresIn: tokens.expires_in,
        connectedBy: connection.connectedBy,
    });
    return tokens.access_token;
};

module.exports = {
    isConfigured,
    getAuthorizationUrl,
    exchangeCodeForTokens,
    fetchAccountEmail,
    saveConnection,
    getConnection,
    disconnectAccount,
    getValidAccessToken,
};
