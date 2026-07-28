const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { requireRole } = require('../middlewares/authMiddleware');

const canEdit = requireRole(['admin', 'superadmin', 'moderator', 'file_initiator']);

router.get('/', categoryController.getCategories);
router.post('/', canEdit, categoryController.createCategory);
router.put('/reorder', canEdit, categoryController.reorderCategories);
router.put('/:id', canEdit, categoryController.updateCategory);
router.delete('/:id', canEdit, categoryController.deleteCategory);

module.exports = router;
