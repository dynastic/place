const express = require('express');
const passport = require('passport');
const apiRoutes = require('./routes/api');
const routes = require('./routes/public');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const ejs = require("ejs");
const responseFactory = require("./util/responseFactory");
const config = require('./config/database');
const mongoose = require('mongoose');
const session = require('cookie-session')

var app = express();
mongoose.connect(config.database);

// Get params
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'))

// Set rendering engine
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

// Log to console
app.use(morgan('dev'));

app.set('trust proxy', 1)

// Setup passport for auth
app.use(session({
    secret: config.secret,
    name: "session"
}));
app.use(passport.initialize())
app.use(passport.session())

// Handle routes
app.use('/api', apiRoutes);
app.use('/', routes);

app.use(function(req, res, next){
    res.status(404);

    // respond with json
    if (req.accepts('json') && !req.accepts("html")) return res.send({ error: 'Not found' });

    // send HTML
    responseFactory.sendRenderedResponse("errors/404", req, res);
});

// Listen on port 3000
app.listen(config.port, () => {
    console.info(`Place server listening on port ${config.port}`);
});