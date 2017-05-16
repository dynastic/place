const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./user');

var ActionSchema = new Schema({
    actionID: {
        type: String,
        required: true
    },
    performingUserID: {
        type: Schema.ObjectId,
        required: true
    },
    info: Object,
    date: Date,
    moderatingUserID: Schema.ObjectId
});

ActionSchema.methods.toInfo = function() {
    var actionLogger = require("../util/ActionLogger");
    return {
        id: this.id,
        action: actionLogger.infoForAction(this.actionID),
        performingUserID: this.performingUserID,
        info: this.info || [],
        moderatingUserID: this.moderatingUserID,
        date: this.date
    }
}

module.exports = mongoose.model('Action', ActionSchema);