const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../logs/auth.log");

const authLogger = (action) => (req, res, next) => {
  const username = req.body.username || "Unknown";
  const ip = req.ip || req.connection.remoteAddress; // Get client IP
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const status = res.statusCode;
    const logMessage = `[${timestamp}] ${action.toUpperCase()} - User: ${username} - IP: ${ip} - Status: ${status}\n`;

    console.log(logMessage); // Console log for debugging
    fs.appendFileSync(logFilePath, logMessage); // Save to file
  });

  next();
};

module.exports = authLogger;
