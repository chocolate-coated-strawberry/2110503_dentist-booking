const mongoose = require('mongoose');

const SLOT_MS = 15 * 60 * 1000;

const BookingSchema = new mongoose.Schema({
    bookingDate: {
        type: Date,
        required: [true, 'Please add a booking date'],
        validate: {
            // 15-minute slots: epoch ms boundary also matches :00/:15/:30/:45 in UTC+7
            validator: (v) => v.getTime() > Date.now() && v.getTime() % SLOT_MS === 0,
            message: 'Booking time must be in the future on a 15-minute slot (:00, :15, :30, :45)'
        }
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    dentist: {
        type: mongoose.Schema.ObjectId,
        ref: 'Dentist',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// DB-level guard against two concurrent requests taking the same slot
BookingSchema.index({ dentist: 1, bookingDate: 1 }, { unique: true });

module.exports = mongoose.model('Booking', BookingSchema);
