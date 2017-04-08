const MongooseStore = require('express-brute-mongoose');
const bruteForceSchema = require('express-brute-mongoose/dist/schema');
const mongoose = require('mongoose');

const model = mongoose.model('bruteforce', bruteForceSchema);
const store = new MongooseStore(model);

module.exports = store;