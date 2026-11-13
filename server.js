const express = require('express');
const dotenv = require('dotenv');

dotenv.config({ path: './config/config.env' });

const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');
const connectDB = require('./config/db');

// Route files
const auth = require('./routes/auth');
// const dentists = require('./routes/dentists');
const bookings = require('./routes/bookings');

connectDB();

const app = express();

app.set('query parser', 'extended');

// body, cookie parser
app.use(express.json());
app.use(cookieParser());

// security middleware
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10min
    max: process.env.NODE_ENV === 'production' ? 100 : 1000
});
app.use(limiter);

// hpp workaround
app.use((req, res, next) => {
    Object.defineProperty(req, 'query', {
        value: { ...req.query },
        writable: true
    });
    next();
});
app.use(hpp());
app.use(cors());

// swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Dentist Booking API',
            version: '1.0.0',
            description: '2110503 Term Project Dentist Booking REST API'
        },
        servers: [{ url: `http://localhost:${process.env.PORT || 5003}/api/v1` }]
    },
    apis: ['./routes/*.js']
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

// mount routers
app.use('/api/v1/auth', auth);
// app.use('/api/v1/dentists', dentists);
app.use('/api/v1/bookings', bookings);

const PORT = process.env.PORT || 5003;
const server = app.listen(PORT, () => {
    console.log('Server running in ', process.env.NODE_ENV, ' mode on port', PORT)
});

// handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});