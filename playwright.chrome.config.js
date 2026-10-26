// Same as playwright.config.js, but runs on the installed Google Chrome — no `npx playwright install` needed.
// Run: npm run test:chrome
const base = require('./playwright.config.js');

module.exports = {
  ...base,
  use: { ...base.use, channel: 'chrome' },
  reporter: 'line',
};
