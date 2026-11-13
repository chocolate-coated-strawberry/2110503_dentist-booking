const express = require('express');

const { getDentists, getDentist } = require('../controllers/dentists');

const router = express.Router();

router.route('/').get(getDentists);
router.route('/:id').get(getDentist);

module.exports = router;
