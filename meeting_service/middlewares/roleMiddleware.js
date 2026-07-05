const CustomError = require('../errors/CustomError');

const requireRole = (...roles) => (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
        return next();
    }
    return next(new CustomError('Forbidden. You do not have permission to perform this action.', 403));
};

module.exports = { requireRole };
