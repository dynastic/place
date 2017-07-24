const DataModelManager = require("../util/DataModelManager");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require("./user");

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
        action: this.actionID,
        performingUserID: this.performingUserID,
        info: this.info || [],
        moderatingUserID: this.moderatingUserID,
        date: this.date
    };
}

ActionSchema.methods.getInfo = function() {
    return new Promise((resolve, reject) => {
        var info = this.toInfo();
        if(this.performingUserID) {
            User.findById(this.performingUserID).then((user) => {
                info.performingUser = user.toInfo();
                if(this.moderatingUserID) User.findById(this.moderatingUserID).then((mod) => {info.moderatingUser = mod.toInfo(); resolve(info) }).catch(() => resolve(info));
                else resolve(info);
            }).catch((err) => {
                info.performingUser = null;
                if(this.moderatingUserID) User.findById(this.moderatingUserID).then((mod) => {info.moderatingUser = mod.toInfo(); resolve(info) }).catch(() => resolve(info));
                else resolve(info);
            })
        } else {
            resolve(info);
        }
    })
}

module.exports = DataModelManager.registerModel("Action", ActionSchema);