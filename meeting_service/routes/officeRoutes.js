const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const officeController = require('../controllers/officeController');
const { upload } = require('../utils/fileManager');

const { auditLog } = require('../middlewares/auditMiddleware');

const router = express.Router();
const canEdit = requireRole('admin', 'moderator');

router.use(authMiddleware);
router.use(auditLog('office'));

router.get('/', officeController.getOffices);
router.post('/', canEdit, officeController.createOffice);
router.put('/reorder', canEdit, officeController.reorderOffices);
router.post('/upload-csv', canEdit, upload.single('file'), officeController.uploadCsv);
router.get('/download-csv', officeController.downloadCsv);
router.put('/:id', canEdit, officeController.updateOffice);
router.delete('/:id', canEdit, officeController.deleteOffice);

module.exports = router;
