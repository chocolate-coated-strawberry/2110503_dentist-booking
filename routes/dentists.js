const express = require('express');

const {
    getDentists,
    getDentist,
    createDentist,
    updateDentist,
    deleteDentist
} = require('../controllers/dentists');
const bookingRouter = require('./bookings');
const { protect, authorization } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Dentist:
 *       type: object
 *       required:
 *         - name
 *         - yearsOfExperience
 *         - areaOfExpertise
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
 *           example: 673f0c2a9b1e4a0012ab34ce
 *         name:
 *           type: string
 *           maxLength: 50
 *           description: Must be unique
 *           example: Dr. Somchai
 *         yearsOfExperience:
 *           type: number
 *           minimum: 0
 *           example: 12
 *         areaOfExpertise:
 *           type: string
 *           example: Orthodontics
 */

/**
 * @swagger
 * tags:
 *   - name: Dentists
 *     description: Dentist management. Reading is public, writing is admin only.
 * components:
 *   schemas:
 *     DentistResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           $ref: '#/components/schemas/Dentist'
 *     DentistInput:
 *       type: object
 *       description: Writable fields only. On update, send just the fields that change.
 *       properties:
 *         name:
 *           type: string
 *           maxLength: 50
 *           example: Dr. Somchai
 *         yearsOfExperience:
 *           type: number
 *           minimum: 0
 *           example: 12
 *         areaOfExpertise:
 *           type: string
 *           example: Orthodontics
 *   parameters:
 *     DentistPathId:
 *       in: path
 *       name: id
 *       required: true
 *       description: Dentist id (24-character hex string)
 *       schema:
 *         type: string
 *         example: 673f0c2a9b1e4a0012ab34ce
 * paths:
 *   /dentists:
 *     get:
 *       tags: [Dentists]
 *       summary: List dentists (filter, select, sort, paginate)
 *       description: Public. Default sort is name A-Z, default limit 25, maximum limit 100.
 *       parameters:
 *         - in: query
 *           name: name
 *           schema:
 *             type: string
 *           description: Exact match on name
 *         - in: query
 *           name: areaOfExpertise
 *           schema:
 *             type: string
 *           description: Exact match on area of expertise
 *         - in: query
 *           name: "yearsOfExperience[gt]"
 *           schema:
 *             type: number
 *           description: "Years of experience greater than this value"
 *         - in: query
 *           name: "yearsOfExperience[gte]"
 *           schema:
 *             type: number
 *           description: "Years of experience greater than or equal to this value"
 *         - in: query
 *           name: "yearsOfExperience[lt]"
 *           schema:
 *             type: number
 *           description: "Years of experience less than this value"
 *         - in: query
 *           name: "yearsOfExperience[lte]"
 *           schema:
 *             type: number
 *           description: "Years of experience less than or equal to this value"
 *         - in: query
 *           name: "yearsOfExperience[in]"
 *           schema:
 *             type: string
 *           description: "Comma-separated list of exact values, for example 5,10"
 *         - in: query
 *           name: select
 *           schema:
 *             type: string
 *           description: "Comma-separated fields to return, for example name,areaOfExpertise"
 *         - in: query
 *           name: sort
 *           schema:
 *             type: string
 *           description: "Comma-separated fields, prefix with - for descending, for example -yearsOfExperience,name"
 *         - in: query
 *           name: page
 *           schema:
 *             type: integer
 *             minimum: 1
 *             default: 1
 *         - in: query
 *           name: limit
 *           schema:
 *             type: integer
 *             minimum: 1
 *             maximum: 100
 *             default: 25
 *       responses:
 *         '200':
 *           description: List of dentists
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   count:
 *                     type: integer
 *                     description: Number of dentists on this page
 *                     example: 3
 *                   total:
 *                     type: integer
 *                     description: Number of dentists matching the filter
 *                     example: 12
 *                   pagination:
 *                     type: object
 *                     properties:
 *                       next:
 *                         type: object
 *                         properties:
 *                           page:
 *                             type: integer
 *                           limit:
 *                             type: integer
 *                       prev:
 *                         type: object
 *                         properties:
 *                           page:
 *                             type: integer
 *                           limit:
 *                             type: integer
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Dentist'
 *         '400':
 *           $ref: '#/components/responses/BadRequest'
 *     post:
 *       tags: [Dentists]
 *       summary: Create a dentist (admin)
 *       security:
 *         - bearerAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/DentistInput'
 *                 - required:
 *                     - name
 *                     - yearsOfExperience
 *                     - areaOfExpertise
 *       responses:
 *         '201':
 *           description: Dentist created
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/DentistResponse'
 *         '400':
 *           $ref: '#/components/responses/BadRequest'
 *         '401':
 *           $ref: '#/components/responses/Unauthorized'
 *         '403':
 *           $ref: '#/components/responses/Forbidden'
 *   /dentists/{id}:
 *     get:
 *       tags: [Dentists]
 *       summary: Get one dentist
 *       parameters:
 *         - $ref: '#/components/parameters/DentistPathId'
 *       responses:
 *         '200':
 *           description: The dentist
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/DentistResponse'
 *         '400':
 *           $ref: '#/components/responses/BadRequest'
 *         '404':
 *           $ref: '#/components/responses/NotFound'
 *     put:
 *       tags: [Dentists]
 *       summary: Update a dentist (admin)
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - $ref: '#/components/parameters/DentistPathId'
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DentistInput'
 *       responses:
 *         '200':
 *           description: Dentist updated
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/DentistResponse'
 *         '400':
 *           $ref: '#/components/responses/BadRequest'
 *         '401':
 *           $ref: '#/components/responses/Unauthorized'
 *         '403':
 *           $ref: '#/components/responses/Forbidden'
 *         '404':
 *           $ref: '#/components/responses/NotFound'
 *     delete:
 *       tags: [Dentists]
 *       summary: Delete a dentist and all of its bookings (admin)
 *       security:
 *         - bearerAuth: []
 *       parameters:
 *         - $ref: '#/components/parameters/DentistPathId'
 *       responses:
 *         '200':
 *           description: Dentist and its bookings deleted
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success:
 *                     type: boolean
 *                     example: true
 *                   data:
 *                     type: object
 *                     example: {}
 *         '400':
 *           $ref: '#/components/responses/BadRequest'
 *         '401':
 *           $ref: '#/components/responses/Unauthorized'
 *         '403':
 *           $ref: '#/components/responses/Forbidden'
 *         '404':
 *           $ref: '#/components/responses/NotFound'
 */

const router = express.Router();

// Re-route nested bookings: /dentists/:dentistId/bookings
router.use('/:dentistId/bookings', bookingRouter);

router.route('/')
    .get(getDentists)
    .post(protect, authorization('admin'), createDentist);
router.route('/:id')
    .get(getDentist)
    .put(protect, authorization('admin'), updateDentist)
    .delete(protect, authorization('admin'), deleteDentist);

module.exports = router;
