// Termux-friendly root entry point.
// The application source lives in src/app.js; keep this file so `node app.js`
// works for users who start the bot from the project root manually.
const runPreflight = require('./src/utils/preflight');

runPreflight();
require('./src/app');
