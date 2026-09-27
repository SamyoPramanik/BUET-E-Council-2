const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const msAuthController = require('../controllers/msAuthController');

const router = express.Router();
const adminOnly = requireRole('admin', 'superadmin');

router.use(authMiddleware);

router.get('/status', msAuthController.getStatus);
router.get('/connect', adminOnly, msAuthController.connect);
router.get('/callback', msAuthController.callback);
router.post('/disconnect', adminOnly, msAuthController.disconnect);

module.exports = router;
