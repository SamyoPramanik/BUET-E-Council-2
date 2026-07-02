const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const agendaController = require('../controllers/agendaController');

const router = express.Router();

router.use(authMiddleware);

// Agendam routes
router.get('/', agendaController.getAgendams);
router.post('/', agendaController.createAgendam);
router.put('/:id', agendaController.updateAgendam);
router.delete('/:id', agendaController.deleteAgendam);

// Resolution routes (nested or specific endpoints)
router.get('/:id/resolutions', agendaController.getResolutions);
router.post('/:id/resolutions', agendaController.createResolution);
router.put('/resolutions/:resId', agendaController.updateResolution);
router.delete('/resolutions/:resId', agendaController.deleteResolution);

// Annexures
router.post('/:id/annexures', agendaController.addAnnexures);
router.post('/resolutions/:resId/annexures', agendaController.addAnnexures);

module.exports = router;
