const getDeviceInfo = (req) => {
    return {
        userAgent: req.header('User-Agent') || 'unknown',
        acceptLanguage: req.header('Accept-Language') || 'unknown',
        secChUa: req.header('sec-ch-ua') || 'unknown',
        secChUaPlatform: req.header('sec-ch-ua-platform') || 'unknown'
    };
};

module.exports = {
    getDeviceInfo
};
