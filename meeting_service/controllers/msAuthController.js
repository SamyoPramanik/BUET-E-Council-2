const crypto = require('crypto');
const CustomError = require('../errors/CustomError');
const msGraphAuth = require('../utils/msGraphAuth');

const STATE_COOKIE = 'ms_oauth_state';

// Only ever redirects back into this same app, never off-site: must be a
// path (starts with '/') and never protocol-relative ('//host/...').
const isSafeReturnPath = (path) => typeof path === 'string' && /^\/(?!\/)/.test(path);

const getStatus = async (req, res, next) => {
    try {
        if (!msGraphAuth.isConfigured()) {
            return res.json({ success: true, data: { configured: false, connected: false } });
        }
        const connection = await msGraphAuth.getConnection();
        res.json({
            success: true,
            data: {
                configured: true,
                connected: Boolean(connection),
                accountEmail: connection?.accountEmail || null,
                connectedAt: connection?.connectedAt || null,
            },
        });
    } catch (error) {
        next(error);
    }
};

const connect = async (req, res, next) => {
    try {
        if (!msGraphAuth.isConfigured()) {
            return next(new CustomError('Microsoft OAuth is not configured on this server.', 501));
        }

        const returnTo = isSafeReturnPath(req.query.return_to) ? req.query.return_to : '/';
        const nonce = crypto.randomBytes(16).toString('hex');
        const state = Buffer.from(JSON.stringify({ nonce, returnTo })).toString('base64url');

        res.cookie(STATE_COOKIE, state, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 10 * 60 * 1000,
        });

        res.redirect(msGraphAuth.getAuthorizationUrl(state));
    } catch (error) {
        next(error);
    }
};

const callback = async (req, res, next) => {
    try {
        const { code, state, error: msError, error_description: msErrorDescription } = req.query;
        const cookieState = req.cookies?.[STATE_COOKIE];
        res.clearCookie(STATE_COOKIE);

        let returnTo = '/';
        try {
            returnTo = JSON.parse(Buffer.from(state || '', 'base64url').toString('utf8')).returnTo || '/';
        } catch {
            // malformed state; fall through to the mismatch check below, which rejects it
        }
        if (!isSafeReturnPath(returnTo)) returnTo = '/';

        if (msError) {
            return res.redirect(`${returnTo}?ms_auth=error&reason=${encodeURIComponent(msErrorDescription || msError)}`);
        }
        if (!code || !state || !cookieState || state !== cookieState) {
            return res.redirect(`${returnTo}?ms_auth=error&reason=${encodeURIComponent('Invalid or expired sign-in attempt')}`);
        }

        const tokens = await msGraphAuth.exchangeCodeForTokens(code);
        const accountEmail = await msGraphAuth.fetchAccountEmail(tokens.access_token);

        await msGraphAuth.saveConnection({
            accountEmail,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
            connectedBy: req.user?.id || null,
        });

        res.redirect(`${returnTo}?ms_auth=connected`);
    } catch (error) {
        console.error('[ms-auth] callback failed:', error.response?.data || error.message);
        next(error);
    }
};

const disconnect = async (req, res, next) => {
    try {
        await msGraphAuth.disconnectAccount();
        res.json({ success: true, message: 'Outlook mailbox disconnected.' });
    } catch (error) {
        next(error);
    }
};

module.exports = { getStatus, connect, callback, disconnect };
