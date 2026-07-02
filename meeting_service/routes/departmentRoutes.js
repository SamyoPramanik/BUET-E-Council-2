const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const departmentController = require('../controllers/departmentController');

const router = express.Router();

router.use(authMiddleware);

router.get('/', departmentController.getDepartments);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;
