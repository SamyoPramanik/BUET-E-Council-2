const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const facultiesController = require('../controllers/facultiesController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', facultiesController.getFaculties);
router.post('/', facultiesController.createFaculty);
router.put('/:id', facultiesController.updateFaculty);
router.delete('/:id', facultiesController.deleteFaculty);

module.exports = router;
