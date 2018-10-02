const winston = require("winston");

const initLogger = () => winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message} ${(info.stack) ? os.EOL + info.stack : ""}`)
  ),
  transports: [
    new winston.transports.Console({ level: "debug" })
    // new winston.transports.File({ filename: "combined.log" })
  ]
});

module.exports.initLogger = initLogger;
