const CustomError = require('../errors/CustomError');

// Origin/Referer allowlist check - a standard, OWASP-endorsed CSRF defense
// for cookie-authenticated JSON APIs.

const defaultOrigins = [
    'https://ecouncil.buet.ac.bd',
    'http://ecouncil.buet.ac.bd',
    'http://localhost:3000',
    'http://localhost:9001',
    'http://localhost'
];

const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(new Set([...defaultOrigins, ...envOrigins]));

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const verifyOrigin = (req, res, next) => {
    if (SAFE_METHODS.has(req.method.toUpperCase())) return next();

    let origin = req.headers.origin;
    if (!origin && req.headers.referer) {
        try {
            origin = new URL(req.headers.referer).origin;
        } catch {
            origin = null;
        }
    }

    if (origin) {
        origin = origin.replace(/\/$/, '');
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const isAllowedHost = host && ALLOWED_ORIGINS.some(o => {
        try {
            return new URL(o).host === host;
        } catch {
            return false;
        }
    });

    if ((origin && ALLOWED_ORIGINS.includes(origin)) || isAllowedHost) {
        return next();
    }

    console.warn(`[Meeting CSRF] Blocked Request. Origin: '${origin}', Host: '${host}'`);
    return next(new CustomError('Request blocked: origin not allowed.', 403));
};

module.exports = { verifyOrigin, ALLOWED_ORIGINS };
