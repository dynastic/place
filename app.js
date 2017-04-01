const app = require('express')();
const passport = require('passport');
const routes = require('./routes/index');

// Handle routes
app.use('/', routes);

// Setup passport for auth
app.use(passport.initialize())
app.use(passport.session())

// Listen on port 3000
app.listen(3000, () => {
    console.info('Place listening on port 3000');
});