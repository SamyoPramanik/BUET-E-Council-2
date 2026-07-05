const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const facultiesController = require('../controllers/facultiesController');
const { upload } = require('../utils/fileManager');

const router = express.Router();
const canEdit = requireRole('admin', 'moderator');

router.use(authMiddleware);

router.get('/', facultiesController.getFaculties);
router.post('/', canEdit, facultiesController.createFaculty);
router.put('/reorder', canEdit, facultiesController.reorderFaculties);
router.post('/upload-csv', canEdit, upload.single('file'), facultiesController.uploadCsv);
router.get('/download-csv', facultiesController.downloadCsv);
router.put('/:id', canEdit, facultiesController.updateFaculty);
router.delete('/:id', canEdit, facultiesController.deleteFaculty);

module.exports = router;
