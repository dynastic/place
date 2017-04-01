const app = require('express')();
const passport = require('passport');
const routes = require('./routes/index');
const bodyParser = require('body-parser');
const morgan = require('morgan');

// Get params
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Log to console
app.use(morgan('dev'));

// Handle routes
app.use('/api', routes);   

// Setup passport for auth
app.use(passport.initialize())
app.use(passport.session())

// Listen on port 3000
app.listen(3000, () => {
    console.info('Place listening on port 3000');
});