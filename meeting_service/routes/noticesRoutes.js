const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const noticeController = require('../controllers/noticeController');
const { auditLog } = require('../middlewares/auditMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(auditLog('notice'));

const noticeAdmins = requireRole('admin', 'superadmin', 'moderator');

router.get('/settings/signatures', noticeAdmins, noticeController.getSignatures);
router.put('/settings/signatures', noticeAdmins, noticeController.updateSignatures);

router.get('/settings/signed-persona', noticeAdmins, noticeController.getSignedPersona);
router.put('/settings/signed-persona', noticeAdmins, noticeController.updateSignedPersona);

router.post('/generate-pdf', noticeAdmins, noticeController.generateNoticePdfFromPayload);

module.exports = router;
