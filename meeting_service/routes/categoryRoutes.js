const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');

const canEdit = requireRole('admin', 'editor');

router.use(authMiddleware);

router.get('/', categoryController.getCategories);
router.post('/', canEdit, categoryController.createCategory);
router.put('/reorder', canEdit, categoryController.reorderCategories);
router.put('/:id', canEdit, categoryController.updateCategory);
router.delete('/:id', canEdit, categoryController.deleteCategory);

module.exports = router;
