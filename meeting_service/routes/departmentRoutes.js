const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const departmentController = require('../controllers/departmentController');
const { upload } = require('../utils/fileManager');

const { auditLog } = require('../middlewares/auditMiddleware');

const router = express.Router();
const canEdit = requireRole('admin', 'moderator');

router.use(authMiddleware);
router.use(auditLog('department'));

router.get('/', departmentController.getDepartments);
router.post('/', canEdit, departmentController.createDepartment);
router.put('/reorder', canEdit, departmentController.reorderDepartments);
router.post('/upload-csv', canEdit, upload.single('file'), departmentController.uploadCsv);
router.get('/download-csv', departmentController.downloadCsv);
router.put('/:id', canEdit, departmentController.updateDepartment);
router.delete('/:id', canEdit, departmentController.deleteDepartment);

module.exports = router;
