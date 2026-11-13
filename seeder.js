const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config/config.env' });

const User = require('./models/User');
const Dentist = require('./models/Dentist');
const Booking = require('./models/Booking');

const force = process.argv.includes('--force');
const SEED_PASSWORD = process.env.SEED_PASSWORD || '123456';

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const { host, name } = mongoose.connection;
    console.log(`Connected to ${host}/${name}`);

    // Wiping is only allowed on a local DB or a DB whose name ends with -test or -demo
    const safe = ['127.0.0.1', 'localhost'].includes(host) || /-(test|demo)$/.test(name);
    if (!safe && !force) {
        console.error(`Refusing to wipe "${name}" on ${host}. Use a local or -test/-demo database, or pass --force.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    // Children first, so no booking is left pointing at a deleted user or dentist
    await Booking.deleteMany();
    await Dentist.deleteMany();
    await User.deleteMany();

    // create() runs the pre-save hook, so passwords are hashed by the model
    await User.create([
        { name: 'Admin', tel: '0800000000', email: 'admin@test.com', password: SEED_PASSWORD, role: 'admin' },
        { name: 'User One', tel: '0811111111', email: 'user1@test.com', password: SEED_PASSWORD },
        { name: 'User Two', tel: '0822222222', email: 'user2@test.com', password: SEED_PASSWORD }
    ]);

    await Dentist.create([
        { name: 'Dr. Somchai Jaidee', yearsOfExperience: 12, areaOfExpertise: 'Orthodontics' },
        { name: 'Dr. Naree Suksan', yearsOfExperience: 7, areaOfExpertise: 'Pediatric Dentistry' },
        { name: 'Dr. Anan Rungrueang', yearsOfExperience: 20, areaOfExpertise: 'Oral Surgery' }
    ]);

    console.log('Seeded: 1 admin, 2 users, 3 dentists (users share the seed password)');
    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
