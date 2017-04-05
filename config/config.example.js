module.exports = {
    'secret': 'CHANGETHISDONTUSETHISITSINSECURE', /* <------- CHANGE THIS DONT USE THE DEFAULT YOU'LL GET HACKED AND DIE 100% */
    'database': 'mongodb://localhost/place',
    'port': 3000,
    'baseURL': 'http://localhost:3000',
    'onlyListenLocal': true,
    'debug': false,
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
    }
}