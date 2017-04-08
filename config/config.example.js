module.exports = {
    'secret': 'CHANGETHISDONTUSETHISITSINSECURE', // <------- CHANGE THIS DONT USE THE DEFAULT YOU'LL GET HACKED AND DIE 100%
    'database': 'mongodb://localhost/place',
    'port': 3000,
    'onlyListenLocal': true,
    'trustProxyDepth': 1, // http://expressjs.com/en/guide/behind-proxies.html
    'debug': false,
    'googleAnalyticsTrackingID': "", // UA-XXXXXXXX-XX
    'host': 'https://place.dynastic.co', // the publicly accessible URL of the site
    'placeTimeout': 300,
    'recaptcha': {
        'siteKey': "",
        'secretKey': ""
    }
}