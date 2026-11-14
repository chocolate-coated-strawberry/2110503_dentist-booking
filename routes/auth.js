const express = require('express');

const { register, login, getMe, logout } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - tel
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *           readOnly: true
 *           example: 673f0c2a9b1e4a0012ab34cd
 *         name:
 *           type: string
 *           example: Postman User
 *         tel:
 *           type: string
 *           description: 9-10 digits starting with 0. Dashes and spaces are accepted and removed.
 *           example: 089-999-9999
 *         email:
 *           type: string
 *           format: email
 *           example: user2@test.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           writeOnly: true
 *           example: "123456"
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           readOnly: true
 *           description: Always "user" on register. The role field in the request body is ignored.
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user2@test.com
 *         password:
 *           type: string
 *           format: password
 *           example: "123456"
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Registration, login and current session
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         _id:
 *           type: string
 *           example: 673f0c2a9b1e4a0012ab34cd
 *         name:
 *           type: string
 *           example: Postman User
 *         email:
 *           type: string
 *           example: user2@test.com
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         token:
 *           type: string
 *           description: JWT. Use it in the Authorize button as the Bearer token.
 * /auth/register:
 *   post:
 *     summary: Register a new user (role is always user)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created, token returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 * /auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Logged in, token returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * /auth/me:
 *   get:
 *     summary: Get the logged in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user (password is never returned)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 * /auth/logout:
 *   get:
 *     summary: Log out (clears the token cookie)
 *     description: The JWT itself stays valid until it expires because tokens are stateless.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);

module.exports = router;