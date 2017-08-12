const config = require('../config/config');

let errors = 0;

for (const method of Object.keys(console)) {
    exports[method] = function log(topic, ...args) {
        console[method](new Date().toISOString(), `[${topic}]`, ...args);
    };
}

// Error handling

exports.raven = null;
if (config.raven) {
    const childProcess = require('child_process');
    const Raven = require('raven');
        
    Raven.config(config.raven, {
        sendTimeout: 5,
        release: childProcess.execSync('git rev-parse HEAD').toString().trim(),
        environment: process.env.NODE_ENV || 'production',
        parseUser: function(req) {
            return {
                username: req.user.username,
                id: req.user._id
            }
        }
    }).install((err, sendErrFailed, eventId) => {
        if (sendErrFailed) exports.error('SENTRY FAIL', eventId, err.stack);
    });
    
    exports.raven = Raven;
}

exports.bugnsnag = null;
if (config.bugsnag) {
    const Bugsnag = require('bugsnag');

    Bugsnag.register(config.bugsnag);
    exports.bugnsnag = Bugsnag;
}

if (config.cachet && config.cachet.site && config.cachet.apiKey && config.cachet.metricID) {
    const Cachet = require("cachet-api");
    const cachet = new Cachet({
        url: config.cachet.site,
        apiKey: config.cachet.apiKey
    });
        
    setInterval(() => {
        cachet.publishMetricPoint({
            id: config.cachet.metricID,
            value: errors
        }).then((response) => {
            errors = 0;
            exports.info('CACHET', `Published error data (count: ${errors}) for last checking interval.`);
        }).catch((err) => console.capture("Couldn't publish errors to cachet: " + err));
    }, 1000 * 60);
}

exports.capture = (error, extra) => {
    errors++;

    // extra is an optional param to give stuff context, like user's etc

    if (exports.raven) exports.raven.captureException(error, extra);
    if (exports.bugsnag) exports.bugnsnag.notify(new Error(error), extra);

    exports.error('ERROR', error);
}
