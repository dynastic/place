const config = require('../config/config');

let errors = 0;

const topicColour = "\x1b[34m"; // blue
const resetColour = "\x1b[0m";
const methodColours = {
    log: "\x1b[35m", // magenta
    info: "\x1b[32m", // green
    warn: "\x1b[33m", // yellow
    error: "\x1b[31m" // red
}

var lastLogTime = null;
var messagesSinceLastDatestamp = 0;

for (const method of Object.keys(console)) {
    exports[method] = function log(topic, ...args) {
        // Datestamp calculation
        var now = new Date();
        // show datestamp for every unique date or every 50 messages for legibility
        if (lastLogTime != null ? now.toDateString() !== lastLogTime.toDateString() : true || messagesSinceLastDatestamp > 50) {
            console.log(`--------- [ MESSAGES ON ${now.toLocaleDateString()} ] ---------`);
            messagesSinceLastDatestamp = 0;
        } else {
            messagesSinceLastDatestamp++
        }
        lastLogTime = now;
        // Actual logging
        console[method](new Date().toLocaleTimeString(), `${topicColour}[${topic.toUpperCase()}]`, `${methodColours[method] || ""}${method.toUpperCase()}:${resetColour}`, ...args);
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
        environment: config.debug ? 'development' : 'production' || 'production',
        parseUser: function(req) {
            if (!req.user) return {}; 
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

exports.capture = (error, extra = null) => {
    errors++;

    // extra is an optional param to give stuff context, like user's etc

    if (exports.raven) exports.raven.captureException(error, extra);
    if (exports.bugsnag) exports.bugnsnag.notify(new Error(error), extra);

    exports.error('ERROR', error, extra);
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
        }).catch((err) => exports.capture("Couldn't publish errors to cachet", err));
    }, 1000 * 60);
}
