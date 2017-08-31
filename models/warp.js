const DataModelManager = require("../util/DataModelManager");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var WarpSchema = new Schema({
    xPos: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value"
        }
    },
    yPos: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "{VALUE} is not an integer value"
        }
    },
    name: {
        type: String,
        required: true
    },
    userID: {
        type: Schema.ObjectId,
        required: true
    },
    creationDate: {
        type: Date,
        required: true
    }
});

WarpSchema.methods.toInfo = function() {
    return {
        location: {
            x: this.xPos,
            y: this.yPos
        },
        name: this.name,
        created: this.creationDate
    };
}

WarpSchema.statics.createWarp = function(x, y, name, userID, callback) {
    if(name.length <= 0 || name.length > 15) return callback(null, { message: "Your warp name must be between 1-15 characters in length.", code: "validation" });
    var warp = this({
        xPos: x,
        yPos: y,
        name: name,
        userID: userID,
        creationDate: Date()
    });

    warp.save(function(err) {
        console.log(err);
        if (err) return callback(null, { message: "An error occurred while trying to create that warp.", code: "server_error" });
        return callback(warp, null);
    });
}

module.exports = DataModelManager.registerModel("Warp", WarpSchema);