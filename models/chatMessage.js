const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const User = require('./user');

var ChatMessageSchema = new Schema({
    userID: {
        type: Schema.ObjectId,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    deleted: {
        type: Boolean,
        required: true,
        default: false
    },
    xPos: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    },
    yPos: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    }
});

ChatMessageSchema.methods.toInfo = function() {
    return {
        id: this.id,
        userID: this.userID,
        date: this.date,
        text: this.text,
        position: {
            x: this.xPos,
            y: this.yPos
        }
    }
}

ChatMessageSchema.methods.getInfo = function(overrideDataAccess = false) {
    return new Promise((resolve, reject) => {
        User.getPubliclyAvailableUserInfo(this.userID, overrideDataAccess, null, false).then((userInfo) => resolve(Object.assign(this.toInfo(), userInfo))).catch((err) => reject(err));
    })
}

ChatMessageSchema.statics.createMessage = function(app, userID, text, xPos, yPos) {
    return this({
        userID: userID,
        date: Date(),
        text: text,
        xPos: xPos,
        yPos: yPos
    }).save();
}

ChatMessageSchema.statics.getLatestMessages = function(limit = 50) {
    return this.find({ deleted: { $ne: true } }).sort({ date: -1 }).limit(limit);
}

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);