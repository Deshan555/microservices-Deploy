const log4js = require('log4js');

log4js.configure({
    appenders: {
        console: { type: 'console' },
        file: { type: 'file', filename: 'app.log' },
    },
    categories: {
        default:
        { appenders: ['console', 'file'],
            level: 'info' },
    },
});
const logger = log4js.getLogger();

module.exports = logger;
