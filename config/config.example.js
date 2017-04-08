module.exports = {
    'secret': 'CHANGETHISDONTUSETHISITSINSECURE', // <------- CHANGE THIS DONT USE THE DEFAULT YOU'LL GET HACKED AND DIE 100%
    'database': 'mongodb://localhost/place',
    'port': 3000,
    'onlyListenLocal': true,
    'trustProxyDepth': 1, // How many levels of proxy to trust for IP
    'debug': false,
    'googleAnalyticsTrackingID': "", // UA-XXXXXXXX-XX
    'host': 'https://place.dynastic.co', // the publicly accessible URL of the site
    'placeTimeout': 300,
    'recaptcha': {
        'siteKey': "",
        'secretKey': ""
    },
    'google': {
        'clientID': '',
        'clientSecret': ''
    },
    'reddit': {
        'clientID': '',
        'clientSecret': ''
    },
    'discord': {
        'clientID': '',
        'clientSecret': ''
    },
    'twitter': {
        'clientID': '',
        'clientSecret': ''
    },
    'github': {
        'clientID': '',
        'clientSecret': ''
    }
}