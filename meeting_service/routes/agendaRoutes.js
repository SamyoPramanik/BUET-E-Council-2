const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireMeetingAuthor, requireMeetingOperator } = require('../middlewares/meetingWorkflowMiddleware');
const agendaController = require('../controllers/agendaController');
const { checkMeetingLock } = require('../middlewares/lockMiddleware');
const { auditLog } = require('../middlewares/auditMiddleware');
const multer = require('multer');
const { fileFilter: annexureFileFilter, MAX_FILE_SIZE_MB } = require('../config/annexureUpload');

// Annexure uploads only: restricted to the formats/size configured in
// config/annexureUpload.js.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
    fileFilter: annexureFileFilter
});

const router = express.Router();

router.use(authMiddleware);
router.use(checkMeetingLock);
router.use(auditLog('agenda'));

// Agendam routes.
// Agenda *content* is the file the initiator prepares and submits, so it is
// editable only by its owner while the file is in draft/sent_back (or by admin).
router.get('/', agendaController.getAgendams);
router.post('/', requireMeetingAuthor, agendaController.createAgendam);
router.put('/:id', requireMeetingAuthor, agendaController.updateAgendam);
router.delete('/:id', requireMeetingAuthor, agendaController.deleteAgendam);

// Resolution routes. Resolutions/execution are recorded during/after the
// meeting, so the owner (or admin) may manage them across the file lifecycle.
router.get('/:id/resolutions', agendaController.getResolutions);
router.post('/:id/resolutions', requireMeetingOperator, agendaController.createResolution);
router.put('/resolutions/:resId', requireMeetingOperator, agendaController.updateResolution);
router.put('/resolutions/:resId/execution', requireMeetingOperator, agendaController.updateExecutionStatus);
router.delete('/resolutions/:resId', requireMeetingOperator, agendaController.deleteResolution);

// Annexures (attachments for agenda items or resolutions).
router.get('/:id/annexures', agendaController.getAnnexures);
router.post('/:id/annexures', requireMeetingOperator, upload.single('file'), agendaController.uploadAnnexure);
router.put('/annexures/reorder', requireMeetingOperator, agendaController.reorderAnnexures);
router.delete('/annexures/:annexureId', requireMeetingOperator, agendaController.deleteAnnexure);

// Revision history (agenda content and resolution text)
router.get('/:id/revisions', agendaController.getRevisions);
router.post('/:id/revisions/:revisionId/restore', requireMeetingAuthor, agendaController.restoreRevision);

module.exports = router;
