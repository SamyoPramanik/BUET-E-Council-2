const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const storageController = require('../controllers/storageController');

const router = express.Router();

router.use(authMiddleware);

// Get presigned URL for a key: GET /api/storage/url?key=...
router.get('/url', storageController.getSignedUrlForKey);

// Matches any nested key for direct streaming fallback, e.g. /api/storage/materials/<id>/agenda-abcd.pdf
router.get('/*key', storageController.streamFile);

module.exports = router;
