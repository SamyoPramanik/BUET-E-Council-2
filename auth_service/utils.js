const { UAParser } = require('ua-parser-js');

const getDeviceInfo = (req) => {
    const userAgent = req.header('User-Agent') || '';
    const { browser, os, device } = UAParser(userAgent);

    return {
        browser: { name: browser.name || 'Unknown', version: browser.version || 'Unknown' },
        os: { name: os.name || 'Unknown', version: os.version || 'Unknown' },
        type: device.type || 'desktop',
        userAgent: userAgent || 'unknown',
        acceptLanguage: req.header('Accept-Language') || 'unknown'
    };
};

module.exports = {
    getDeviceInfo
};
