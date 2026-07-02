const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const facultiesController = require('../controllers/facultiesController');
const { upload } = require('../utils/fileManager');

const router = express.Router();

router.use(authMiddleware);

router.get('/', facultiesController.getFaculties);
router.post('/', facultiesController.createFaculty);
router.put('/reorder', facultiesController.reorderFaculties);
router.post('/upload-csv', upload.single('file'), facultiesController.uploadCsv);
router.get('/download-csv', facultiesController.downloadCsv);
router.put('/:id', facultiesController.updateFaculty);
router.delete('/:id', facultiesController.deleteFaculty);

module.exports = router;
