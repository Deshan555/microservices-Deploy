const express = require('express');
const { jsonParser } = require('./src/middleware/middleware');
const endPoints = require('./src/routes/Routes');

const server = express();
const port = 3000;

server.use(jsonParser);

server.use('/thaprobane/core/v01', endPoints);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


