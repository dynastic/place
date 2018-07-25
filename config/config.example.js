module.exports = {
    "secret": "CHANGETHISDONTUSETHISITSINSECURE", // <------- CHANGE THIS DONT USE THE DEFAULT YOU'LL GET HACKED AND DIE 100%
    "database": "mongodb://localhost/place",
    "port": 3000,
    "boardSize": 1600, 
    "onlyListenLocal": true,
    "trustProxyDepth": 1, // How many levels of proxy to trust for IP
    "debug": false,
    "googleAnalyticsTrackingID": "", // UA-XXXXXXXX-XX
    "host": "https://canvas.place", // the publicly accessible URL of the site
    "placeTimeout": 60,
    'enableChangelogs': true,
    'siteName': 'Place',
    // "raven": "", 
    // "publicRaven": "", 
    // "bugsnag": "",
    'maintenance': {
        'allowSignups': true, 
        'allowLogins': true,
        'notice': undefined
    },
    "cachet": {
        // Setup reporting error count as a metric to Cachet
        "apiKey": "",
        "site": "",
        "metricID": 0
    },
    "recaptcha": { // Leave blank to disable
        "siteKey": "",
        "secretKey": ""
    },
    "oauth": {
        // No field here is required.
        // To use an oauth option, set enabled to true, and drop your keys in.
        "google": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        },
        "reddit": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        },
        "discord": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        },
        "twitter": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        },
        "github": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        },
        "facebook": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        },
        "microsoft": {
            "enabled": false,
            "clientID": "",
            "clientSecret": ""
        }
    },
    "pixelFlags": []
};
