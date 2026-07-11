const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const searchController = require('../controllers/searchController');

const router = express.Router();

router.use(authMiddleware);
router.get('/', searchController.search);

module.exports = router;
