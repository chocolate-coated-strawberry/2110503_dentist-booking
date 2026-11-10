const User = require('../models/User');

const handleRegisterError = (err, res) => {
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'This email is already registered'
    });
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({ success: false, message });
  }
  console.log(err.message);
  return res.status(500).json({ success: false, message: 'Server error' });
};

// @desc      Register user
// @route     POST /api/v1/auth/register
// @access    Public
exports.register = async (req, res, next) => {
  try {
    const { name, tel, email, password } = req.body;

    const user = await User.create({ name, tel, email, password });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    handleRegisterError(err, res);
  }
};

// @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// token
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000 // ms
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token
  });
};

// @desc      Get current logged in user
// @route     GET /api/v1/auth/me
// @access    Private
exports.getMe = async (req, res, next) => {
  res.status(200).json({ success: true, data: req.user });
};

// @desc      Log user out / clear cookie
// @route     GET /api/v1/auth/logout
// @access    Private
exports.logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, data: {} });
};