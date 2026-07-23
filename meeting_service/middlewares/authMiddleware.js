const axios = require('axios');
const CustomError = require('../errors/CustomError');

const auth_service_url = process.env.AUTH_SERVICE_URL || 'http://auth_service:8000';

const authMiddleware = async (req, res, next) => {
    try {
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        } else if (req.cookies && req.cookies.session_token) {
            token = req.cookies.session_token;
        }

        if (!token) {
            return next(new CustomError('You are not logged in. Please log in to get access.', 401));
        }

        // Verify token with auth_service
        try {
            const response = await axios.get(`${auth_service_url}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data && response.data.success) {
                // Attach user info to request
                req.user = response.data.data;
                next();
            } else {
                return next(new CustomError('Authentication failed.', 401));
            }
        } catch (error) {
            console.error('Auth service verification failed:', error.message);
            return next(new CustomError('Invalid or expired session.', 401));
        }

    } catch (err) {
        next(err);
    }
};

module.exports = { authMiddleware };
