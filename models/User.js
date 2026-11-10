const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    tel: {
        type: String,
        required: [true, 'Please add a telephone number'],
        // match: [/^[0-9+\-\s]{9,15}$/, 'Please add a valid telephone number']
        set: (v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v),
        match: [/^0\d{8,9}$/, 'Please add a valid telephone number (9-10 digits starting with 0)']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please add a valid email'
        ]
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

UserSchema.virtual('telFormatted').get(function () {
  if (!this.tel) return this.tel;
  return this.tel.length === 10
    ? this.tel.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3')  // 089-999-9999
    : this.tel.replace(/^(\d{2})(\d{3})(\d{4})$/, '$1-$2-$3'); // 02-123-4567
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);