const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const departmentController = require('../controllers/departmentController');
const { upload } = require('../utils/fileManager');

const router = express.Router();

router.use(authMiddleware);

router.get('/', departmentController.getDepartments);
router.post('/', departmentController.createDepartment);
router.put('/reorder', departmentController.reorderDepartments);
router.post('/upload-csv', upload.single('file'), departmentController.uploadCsv);
router.get('/download-csv', departmentController.downloadCsv);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
