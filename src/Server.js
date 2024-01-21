const express = require('express');
const bodyParser = require('body-parser');
const endPoints = require('./routes/Routes');
const logger = require('morgan');
const cors = require('cors');

const server = express();
server.use(logger('dev'));
const port = 3000;

server.use(bodyParser.json());

server.use('/thaprobane/core/v01', endPoints);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
