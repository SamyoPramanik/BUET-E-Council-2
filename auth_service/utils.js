const getBrowserName = (ua) => {
    if (!ua || ua === 'unknown') return 'Unknown Browser';
    if (ua.includes('Firefox') && !ua.includes('Seamonkey')) return 'Firefox';
    if (ua.includes('Seamonkey')) return 'Seamonkey';
    if (ua.includes('Chrome') && !ua.includes('Chromium') && !ua.includes('Edg') && !ua.includes('OPR')) return 'Chrome';
    if (ua.includes('Chromium')) return 'Chromium';
    if (ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium')) return 'Safari';
    if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('MSIE') || ua.includes('Trident')) return 'Internet Explorer';
    if (ua.includes('Edge') || ua.includes('Edg')) return 'Edge';
    return 'Unknown Browser';
};

const getOSName = (ua) => {
    if (!ua || ua === 'unknown') return 'Unknown OS';
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (ua.includes('Windows NT 6.2')) return 'Windows 8';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone')) return 'iOS (iPhone)';
    if (ua.includes('iPad')) return 'iOS (iPad)';
    if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
};

const getDeviceType = (ua) => {
    if (!ua || ua === 'unknown') return 'desktop';
    const uaLower = ua.toLowerCase();
    if (uaLower.includes('ipad') || uaLower.includes('tablet')) {
        return 'tablet';
    }
    if (uaLower.includes('mobi') || uaLower.includes('android') || uaLower.includes('iphone') || uaLower.includes('ipod')) {
        return 'mobile';
    }
    return 'desktop';
};

const getDeviceInfo = (req) => {
    const ua = req.header('User-Agent') || 'unknown';
    return {
        userAgent: ua,
        acceptLanguage: req.header('Accept-Language') || 'unknown',
        secChUa: req.header('sec-ch-ua') || 'unknown',
        secChUaPlatform: req.header('sec-ch-ua-platform') || 'unknown',
        browser: {
            name: getBrowserName(ua)
        },
        os: {
            name: getOSName(ua)
        },
        type: getDeviceType(ua)
    };
};

module.exports = {
    getDeviceInfo
};
