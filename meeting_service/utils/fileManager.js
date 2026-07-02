const multer = require('multer');

// Configure multer to store files in memory temporarily
// before we upload them to R3 storage
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB size limit
    },
});

module.exports = {
    upload
};
