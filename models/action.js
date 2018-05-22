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

ActionSchema.methods.toInfo = function(userIDs = true) {
    var info = {
        id: this.id,
        action: this.actionID,
        info: this.info || [],
        date: this.date
    };
    if (userIDs) {
        info.performingUserID = this.performingUserID;
        info.moderatingUserID = this.moderatingUserID
    }
    return info
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