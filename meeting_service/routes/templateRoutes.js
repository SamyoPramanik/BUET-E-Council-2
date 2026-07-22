const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const templateController = require('../controllers/templateController');

const router = express.Router();
// Initiators, moderators, admins and superadmins can all author templates.
const canEdit = requireRole('admin', 'superadmin', 'moderator', 'file_initiator');

router.use(authMiddleware);

router.get('/', templateController.getTemplates);
router.get('/search', templateController.searchTemplates);
router.post('/', canEdit, templateController.createTemplate);
router.put('/:id', canEdit, templateController.updateTemplate);
router.delete('/:id', canEdit, templateController.deleteTemplate);
router.patch('/:id/visibility', canEdit, templateController.updateVisibility);
router.post('/:id/use', canEdit, templateController.incrementUseCount);

module.exports = router;
