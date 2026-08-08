const express = require('express');
const bodyParser = require('body-parser');
const endPoints = require('./routes/Routes');
const logger = require('morgan');
const cors = require('cors');
const statusMonitor = require('express-status-monitor'); // Add this line
const http = require('http');
const { initializeFirebase } = require('./services/FirebasePushService');

const server = express();
const port = 3001;

server.use(logger('dev'));

server.use(cors());

server.use(bodyParser.json({ limit: '10mb' }));

server.use(statusMonitor()); // Add this line

server.use('/thaprobane/core/v01', endPoints);

const httpServer = http.createServer(server);
initializeFirebase();

httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

module.exports = { httpServer, server };
