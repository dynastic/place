const CachetAPI = require("cachet-api");

function ErrorTracker(app) {
    var hasCachet = typeof app.config.cachet !== "undefined";
    var apiKey = hasCachet ? app.config.cachet.apiKey : null;
    var site = hasCachet ? app.config.cachet.site : null;
    var metricID = hasCachet ? app.config.cachet.metricID : null;
    var cachet = null;
    if(apiKey && site && metricID !== null && apiKey != "" && site != "") cachet = new CachetAPI({ url: site, apiKey: apiKey });
    var errors = 0;
    var tracker = {

        reportError: function(error = "Unknown error!") {
            // On error: log it, and record it
            console.error(error);
	    if (app.raven !== undefined) app.raven.captureException(error);
            errors++;
        },

        handleErrorCheckingInterval: function() {
            // Time interval for reporting has passed, report to Cachet and clear internal count
            if(cachet) {
                cachet.publishMetricPoint({
                    id: metricID,
                    value: errors
                }).then(function (response) {
                    errors = 0;
                    console.log(`Published error data (count: ${errors}) for last checking interval.`);
                }).catch((err) => console.error("Couldn't publish errors to cachet: " + err));
            }
        }
    }
    if(cachet) setInterval(tracker.handleErrorCheckingInterval, 1000 * 60);
    return tracker;
}

ErrorTracker.prototype = Object.create(ErrorTracker.prototype);

module.exports = ErrorTracker;
