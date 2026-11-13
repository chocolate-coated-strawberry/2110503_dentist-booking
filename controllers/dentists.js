const mongoose = require('mongoose');
const Dentist = require('../models/Dentist');
const Booking = require('../models/Booking');

// Same id guard as controllers/bookings.js: only 24-hex strings / ObjectIds
const isId = (id) => mongoose.isObjectIdOrHexString(id);

// Query whitelist: only real Dentist fields and known comparison operators
const FILTER_FIELDS = ['name', 'yearsOfExperience', 'areaOfExpertise'];
const OPERATORS = ['gt', 'gte', 'lt', 'lte', 'in'];
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

// Accept "a,b" or repeated params (?x[in]=a&x[in]=b) as a list
const toList = (v) => (Array.isArray(v) ? v : String(v).split(',')).map((s) => String(s).trim());

// Build a Mongo filter from req.query; returns null if the query is not allowed
const buildFilter = (query) => {
    const filter = {};

    for (const field of FILTER_FIELDS) {
        const value = query[field];
        if (value === undefined) continue;

        // ?name=Dr.%20A -> exact match
        if (typeof value === 'string') {
            filter[field] = value;
            continue;
        }

        // ?yearsOfExperience[gte]=5 -> { yearsOfExperience: { $gte: '5' } }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const condition = {};
            for (const [op, v] of Object.entries(value)) {
                if (!OPERATORS.includes(op)) return null;
                condition[`$${op}`] = op === 'in' ? toList(v) : String(v);
            }
            filter[field] = condition;
            continue;
        }

        return null;
    }

    return filter;
};

//@desc     Get all dentists (filter, select, sort, pagination)
//@route    GET /api/v1/dentists
//@access   Public
exports.getDentists = async (req, res, next) => {
    const filter = buildFilter(req.query);
    if (!filter) {
        return res.status(400).json({
            success: false,
            message: `Filter only on ${FILTER_FIELDS.join(', ')} with operators ${OPERATORS.join(', ')}`
        });
    }

    try {
        let query = Dentist.find(filter);

        // Select fields: ?select=name,areaOfExpertise
        if (req.query.select) {
            query = query.select(String(req.query.select).split(',').join(' '));
        }

        // Sort: ?sort=-yearsOfExperience,name (default: name A-Z)
        query = query.sort(req.query.sort ? String(req.query.sort).split(',').join(' ') : 'name');

        // Pagination: page >= 1, limit clamped to 1..MAX_LIMIT
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Count only documents that match the filter (A10 counted the whole collection)
        const total = await Dentist.countDocuments(filter);

        const dentists = await query.skip(startIndex).limit(limit);

        const pagination = {};
        if (endIndex < total) pagination.next = { page: page + 1, limit };
        if (startIndex > 0) pagination.prev = { page: page - 1, limit };

        res.status(200).json({
            success: true,
            count: dentists.length,
            total,
            pagination,
            data: dentists
        });
    } catch (err) {
        // e.g. ?yearsOfExperience[gte]=abc cannot be cast to Number
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` });
        }
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot find dentists' });
    }
};

//@desc     Get single dentist
//@route    GET /api/v1/dentists/:id
//@access   Public
exports.getDentist = async (req, res, next) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: `Invalid id: ${req.params.id}` });
    }

    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({
                success: false,
                message: `No dentist with the id of ${req.params.id}`
            });
        }

        res.status(200).json({
            success: true,
            data: dentist
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot find dentist' });
    }
};

// Only these fields are writable from the request body
const WRITABLE_FIELDS = ['name', 'yearsOfExperience', 'areaOfExpertise'];
const pickWritable = (body = {}) =>
    Object.fromEntries(WRITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Map known write errors to 400; everything else stays 500
const writeError = (err, res, fallback) => {
    if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'A dentist with this name already exists' });
    }
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((e) => e.message).join(', ');
        return res.status(400).json({ success: false, message });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid value for ${err.path}` });
    }
    console.log(err);
    return res.status(500).json({ success: false, message: fallback });
};

//@desc     Create a dentist
//@route    POST /api/v1/dentists
//@access   Private (admin)
exports.createDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.create(pickWritable(req.body));
        res.status(201).json({ success: true, data: dentist });
    } catch (err) {
        return writeError(err, res, 'Cannot create dentist');
    }
};

//@desc     Update a dentist
//@route    PUT /api/v1/dentists/:id
//@access   Private (admin)
exports.updateDentist = async (req, res, next) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: `Invalid id: ${req.params.id}` });
    }

    try {
        const dentist = await Dentist.findByIdAndUpdate(req.params.id, pickWritable(req.body), {
            new: true,
            runValidators: true
        });

        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.id}` });
        }

        res.status(200).json({ success: true, data: dentist });
    } catch (err) {
        return writeError(err, res, 'Cannot update dentist');
    }
};

//@desc     Delete a dentist and all of its bookings
//@route    DELETE /api/v1/dentists/:id
//@access   Private (admin)
exports.deleteDentist = async (req, res, next) => {
    if (!isId(req.params.id)) {
        return res.status(400).json({ success: false, message: `Invalid id: ${req.params.id}` });
    }

    try {
        const dentist = await Dentist.findById(req.params.id);

        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.id}` });
        }

        // Cascade in the controller (same approach as A10's deleteHospital, no model hook)
        await Booking.deleteMany({ dentist: req.params.id });
        await dentist.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ success: false, message: 'Cannot delete dentist' });
    }
};
