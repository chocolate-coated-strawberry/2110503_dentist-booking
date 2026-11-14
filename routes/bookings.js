const express = require('express');

const {
    getBookings,
    getBooking,
    addBooking,
    updateBooking,
    deleteBooking
} = require('../controllers/bookings');
const { protect, authorization } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the booking
 *         bookingDate:
 *           type: string
 *           format: date-time
 *           description: Appointment time, in the future and on a 15-minute slot (:00, :15, :30, :45)
 *         user:
 *           type: string
 *           description: Id of the user who owns the booking (taken from the token, never from the body)
 *         dentist:
 *           description: Dentist id after create/update; the dentist object when reading bookings
 *           oneOf:
 *             - type: string
 *             - type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 yearsOfExperience:
 *                   type: number
 *                 areaOfExpertise:
 *                   type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: 6650a1b2c3d4e5f6a7b8c9d0
 *         bookingDate: '2026-12-01T03:00:00.000Z'
 *         user: 6650a1b2c3d4e5f6a7b8c9d1
 *         dentist:
 *           _id: 6650a1b2c3d4e5f6a7b8c9d2
 *           name: Dr. Somchai Jaidee
 *           yearsOfExperience: 12
 *           areaOfExpertise: Orthodontics
 *         createdAt: '2026-11-14T08:00:00.000Z'
 *     BookingInput:
 *       type: object
 *       properties:
 *         bookingDate:
 *           type: string
 *           format: date-time
 *           description: Future time on a 15-minute slot. Required when creating.
 *         dentist:
 *           type: string
 *           description: Dentist id. Required for POST /bookings, ignored for POST /dentists/{dentistId}/bookings, optional on update.
 *       example:
 *         bookingDate: '2026-12-01T03:00:00.000Z'
 *         dentist: 6650a1b2c3d4e5f6a7b8c9d2
 *     BookingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Booking'
 *     BookingListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 1
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Booking'
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *   parameters:
 *     BookingId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *       description: The booking id (24-character hex)
 *     DentistId:
 *       in: path
 *       name: dentistId
 *       required: true
 *       schema:
 *         type: string
 *       description: The dentist id (24-character hex)
 *   responses:
 *     BadRequest:
 *       description: Invalid id, missing or invalid field, or the user already has a booking
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Unauthorized:
 *       description: Missing or invalid token
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Forbidden:
 *       description: The user is not the owner of this booking (and not an admin)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     NotFound:
 *       description: No booking or dentist with that id
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Conflict:
 *       description: This dentist is already booked at that time (no double-booking)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Book, view, edit and delete dentist bookings
 */

/**
 * @swagger
 * /bookings:
 *   get:
 *     summary: List bookings (a user sees only their own, an admin sees all)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The list of bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Book a dentist (a user can hold only one booking)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       201:
 *         description: The booking was created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

/**
 * @swagger
 * /dentists/{dentistId}/bookings:
 *   get:
 *     summary: List bookings of one dentist (admin); a user still sees only their own bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DentistId'
 *     responses:
 *       200:
 *         description: The list of bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingListResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *   post:
 *     summary: Book this dentist (a user can hold only one booking)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/DentistId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *           example:
 *             bookingDate: '2026-12-01T03:00:00.000Z'
 *     responses:
 *       201:
 *         description: The booking was created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     summary: Get a booking by id (owner or admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BookingId'
 *     responses:
 *       200:
 *         description: The booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     summary: Change the time or dentist of a booking (owner or admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BookingId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BookingInput'
 *     responses:
 *       200:
 *         description: The booking was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BookingResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *   delete:
 *     summary: Delete a booking (owner or admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/BookingId'
 *     responses:
 *       200:
 *         description: The booking was deleted
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: {}
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.route('/')
    .get(protect, getBookings)
    .post(protect, authorization('admin', 'user'), addBooking);
router.route('/:id')
    .get(protect, getBooking)
    .put(protect, authorization('admin', 'user'), updateBooking)
    .delete(protect, authorization('admin', 'user'), deleteBooking);

module.exports = router;
