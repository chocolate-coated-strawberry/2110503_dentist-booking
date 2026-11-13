const express = require('express');

const {
    getDentists,
    getDentist,
    createDentist,
    updateDentist,
    deleteDentist
} = require('../controllers/dentists');
const { protect, authorization } = require('../middleware/auth');

const router = express.Router();

router.route('/')
    .get(getDentists)
    .post(protect, authorization('admin'), createDentist);
router.route('/:id')
    .get(getDentist)
    .put(protect, authorization('admin'), updateDentist)
    .delete(protect, authorization('admin'), deleteDentist);

module.exports = router;
