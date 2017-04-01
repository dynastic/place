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

app.use(function(req, res, next){
    res.status(404);

    // respond with json
    if (req.accepts('json') && !req.accepts("html")) {
        res.send({ error: 'Not found' });
        return;
    }

    // send HTML
    res.render('404', { url: req.url });
});

// Listen on port 3000
app.listen(3000, () => {
    console.info('Place listening on port 3000');
});