const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/roleMiddleware');
const tagController = require('../controllers/tagController');

const router = express.Router();
// Must match every role that can reach the tag-create UI: agenda authors
// (admin/superadmin/file_initiator via canAuthorMeeting) and resolution
// authors (admin/superadmin/file_initiator via canOperateMeeting), plus
// moderator for review-time edits.
const canEdit = requireRole('admin', 'superadmin', 'moderator', 'file_initiator');

router.use(authMiddleware);

router.get('/', tagController.getTags);
router.post('/', canEdit, tagController.createTag);

module.exports = router;
