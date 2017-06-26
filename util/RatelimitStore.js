const MongooseStore = require("express-brute-mongoose");
const bruteForceSchema = require("express-brute-mongoose/dist/schema");
const mongoose = require("mongoose");

function RatelimitStore(name = null) {
    const model = mongoose.model(`bruteforce${name ? `${-name}` : ""}`, bruteForceSchema);
    return new MongooseStore(model);
}

RatelimitStore.prototype = Object.create(RatelimitStore.prototype);

module.exports = RatelimitStore;