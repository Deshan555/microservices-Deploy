const express = require('express');
const bodyParser = require('body-parser');
const endPoints = require('./routes/Routes');
const logger = require('morgan');
const cors = require('cors');

const server = express();
const port = 3001;

server.use(logger('dev'));

server.use(cors());

server.use(bodyParser.json());

server.use('/thaprobane/core/v01', endPoints);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


// cors modifications in the server.js file
// server.use(cors({
//     origin: 'http://your_frontend_domain.com',  // Replace with the domain of your frontend
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,  // Enable credentials (cookies, authorization headers, etc.)
//     optionsSuccessStatus: 204,  // Some legacy browsers (IE11, various SmartTVs) choke on 204
// }));
