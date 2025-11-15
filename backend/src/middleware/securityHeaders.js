// backend/src/middleware/securityHeaders.js
const helmet = require("helmet");

module.exports = helmet({
  contentSecurityPolicy: false, // simplify for development
});
