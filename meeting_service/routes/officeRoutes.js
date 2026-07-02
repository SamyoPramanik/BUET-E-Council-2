const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const officeController = require('../controllers/officeController');
const { upload } = require('../utils/fileManager');

const router = express.Router();

router.use(authMiddleware);

router.get('/', officeController.getOffices);
router.post('/', officeController.createOffice);
router.put('/reorder', officeController.reorderOffices);
router.post('/upload-csv', upload.single('file'), officeController.uploadCsv);
router.get('/download-csv', officeController.downloadCsv);
router.put('/:id', officeController.updateOffice);
router.delete('/:id', officeController.deleteOffice);

module.exports = router;
