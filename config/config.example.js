module.exports = {
    'secret': 'CHANGETHISDONTUSETHISITSINSECURE', // <------- CHANGE THIS DONT USE THE DEFAULT YOU'LL GET HACKED AND DIE 100%
    'database': 'mongodb://localhost/place',
    'port': 3000,
    'onlyListenLocal': true,
    'debug': false,
    'host': 'https://place.dynastic.co', // the publicly accessible URL of the site
    'placeTimeout': 300,
    'recaptcha': {
        'siteKey': "",
        'secretKey': ""
    }
}