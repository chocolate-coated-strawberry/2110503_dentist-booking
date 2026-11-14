// Postman cannot read config/config.env, so pass the server URL from it to newman.
// Start the server first (npm run dev), then: npm test
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', 'config.env'), quiet: true });
const newman = require('newman');

// Default: the presentation demo (steps 1-12 in course order).
// npm run test:full runs A (auth + dentists) then B (bookings + double-booking) instead.
const COLLECTIONS = process.argv.length > 2 ? process.argv.slice(2) : ['dentist-booking-demo'];

const run = (name) => new Promise((resolve, reject) => {
    newman.run({
        collection: require(`./${name}.postman_collection.json`),
        // an environment variable overrides the collection's default URL (localhost:5003)
        envVar: [{ key: 'URL', value: `http://localhost:${process.env.PORT || 5003}` }],
        reporters: 'cli'
    }, (err, summary) => (err ? reject(err) : resolve(summary.run.failures.length)));
});

(async () => {
    let failures = 0;
    for (const name of COLLECTIONS) failures += await run(name);
    process.exitCode = failures ? 1 : 0;
})();
