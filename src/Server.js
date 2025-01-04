const express = require('express');
const bodyParser = require('body-parser');
const endPoints = require('./routes/Routes');
const logger = require('morgan');
const cors = require('cors');
const statusMonitor = require('express-status-monitor'); // Add this line

const server = express();
const port = 3001;

server.use(logger('dev'));

server.use(cors());

server.use(bodyParser.json());

server.use(statusMonitor()); // Add this line

server.use('/thaprobane/core/v01', endPoints);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
