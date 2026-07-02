const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const meetingController = require('../controllers/meetingController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', meetingController.createMeeting);
router.put('/:id', meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting); // critical

router.post('/:id/agendams', meetingController.addAgendamToMeeting);
router.post('/:id/invitees', meetingController.addInvitees);
router.post('/:id/presentees', meetingController.addPresentees);

router.get('/:id/pdf/agenda', meetingController.generateAgendaPdf);
router.get('/:id/pdf/resolution', meetingController.generateResolutionPdf);
router.get('/:id/pdf/attendance', meetingController.generateAttendanceSheet);

module.exports = router;
