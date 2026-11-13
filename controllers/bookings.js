const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Dentist = require('../models/Dentist');

const DENTIST_FIELDS = 'name yearsOfExperience areaOfExpertise';

// Reject malformed ids before they reach a query (only 24-hex strings / ObjectIds)
const invalidId = (res, id) => res.status(400).json({ success: false, message: `Invalid id: ${id}` });
const isId = (id) => mongoose.isObjectIdOrHexString(id);

// Map known errors to 4xx; everything else stays 500
const writeError = (err, res, fallback) => {
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'This dentist is already booked at that time' });
    }
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({ success: false, message: err.message });
    }
    console.log(err);
    return res.status(500).json({ success: false, message: fallback });
};

//@desc     Get all bookings
//@route    GET /api/v1/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
    if (req.params.dentistId && !isId(req.params.dentistId)) return invalidId(res, req.params.dentistId);

    let query;

    if (req.user.role !== 'admin') {
        // General users see only their own booking
        query = Booking.find({ user: req.user.id }).populate({
            path: 'dentist',
            select: DENTIST_FIELDS
        });
    } else if (req.params.dentistId) {
        query = Booking.find({ dentist: req.params.dentistId }).populate({
            path: 'dentist',
            select: DENTIST_FIELDS
        });
    } else {
        query = Booking.find().populate({
            path: 'dentist',
            select: DENTIST_FIELDS
        });
    }

    try {
        const bookings = await query;

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings
        });
    } catch (err) {
        return writeError(err, res, 'Cannot find bookings');
    }
};

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Private
exports.getBooking = async (req, res, next) => {
    if (!isId(req.params.id)) return invalidId(res, req.params.id);

    try {
        const booking = await Booking.findById(req.params.id).populate({
            path: 'dentist',
            select: DENTIST_FIELDS
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure user is the booking owner
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: `User ${req.user.id} is not authorized to view this booking`
            });
        }

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        return writeError(err, res, 'Cannot find booking');
    }
};

//@desc     Add booking
//@route    POST /api/v1/dentists/:dentistId/bookings (or POST /api/v1/bookings with dentist in body)
//@access   Private
exports.addBooking = async (req, res, next) => {
    try {
        req.body.user = req.user.id;
        req.body.dentist = req.params.dentistId || req.body.dentist;

        if (!req.body.dentist) {
            return res.status(400).json({ success: false, message: 'Please add a dentist' });
        }
        if (!isId(req.body.dentist)) return invalidId(res, req.body.dentist);

        // Non-admin users can only have ONE booking
        const existedBooking = await Booking.findOne({ user: req.user.id });
        if (existedBooking && req.user.role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: `The user with ID ${req.user.id} already has a booking`
            });
        }

        const dentist = await Dentist.findById(req.body.dentist);
        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `No dentist with the id of ${req.body.dentist}`
            });
        }

        // No double-booking: same dentist, same slot
        // Missing date is left to the model's required validator (400)
        const taken = req.body.bookingDate
            && await Booking.findOne({ dentist: req.body.dentist, bookingDate: req.body.bookingDate });
        if (taken) {
            return res.status(409).json({
                success: false,
                message: `This dentist is already booked at ${req.body.bookingDate}`
            });
        }

        const booking = await Booking.create({
            bookingDate: req.body.bookingDate,
            user: req.body.user,
            dentist: req.body.dentist
        });

        res.status(201).json({
            success: true,
            data: booking
        });
    } catch (err) {
        return writeError(err, res, 'Cannot create booking');
    }
};

//@desc     Update booking
//@route    PUT /api/v1/bookings/:id
//@access   Private
exports.updateBooking = async (req, res, next) => {
    if (!isId(req.params.id)) return invalidId(res, req.params.id);

    try {
        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure user is the booking owner
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: `User ${req.user.id} is not authorized to update this booking`
            });
        }

        // Only these fields can change; never reassign the booking to another user
        const update = {};
        if (req.body.bookingDate !== undefined) update.bookingDate = req.body.bookingDate;
        if (req.body.dentist !== undefined) update.dentist = req.body.dentist;

        if (update.dentist !== undefined) {
            if (!isId(update.dentist)) return invalidId(res, update.dentist);
            const dentist = await Dentist.findById(update.dentist);
            if (!dentist) {
                return res.status(404).json({
                    success: false,
                    message: `No dentist with the id of ${update.dentist}`
                });
            }
        }

        // No double-booking: another booking already has this dentist + slot
        const dentistId = update.dentist || booking.dentist;
        const bookingDate = update.bookingDate || booking.bookingDate;
        const taken = await Booking.findOne({
            _id: { $ne: booking._id },
            dentist: dentistId,
            bookingDate
        });
        if (taken) {
            return res.status(409).json({
                success: false,
                message: `This dentist is already booked at ${bookingDate}`
            });
        }

        booking = await Booking.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        return writeError(err, res, 'Cannot update booking');
    }
};

//@desc     Delete booking
//@route    DELETE /api/v1/bookings/:id
//@access   Private
exports.deleteBooking = async (req, res, next) => {
    if (!isId(req.params.id)) return invalidId(res, req.params.id);

    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: `No booking with the id of ${req.params.id}`
            });
        }

        // Make sure user is the booking owner
        if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: `User ${req.user.id} is not authorized to delete this booking`
            });
        }

        await booking.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        return writeError(err, res, 'Cannot delete booking');
    }
};
