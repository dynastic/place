const mongoose = require("mongoose");
const Schema = mongoose.Schema;

var colourPieceValidator = function(c) {
    return Number.isInteger(c) && c >= 0 && c <= 255;
}

var PixelSchema = new Schema({
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
    editorID: {
        type: Schema.ObjectId,
        required: true
    },
    lastModified: {
        type: Date,
        required: true
    },
    colourR: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: "{VALUE} is not a valid colour"
        }
    },
    colourG: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: "{VALUE} is not a valid colour"
        }
    },
    colourB: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: "{VALUE} is not a valid colour"
        }
    }
});

PixelSchema.methods.toInfo = function() {
    return {
        point: {
            x: this.xPos,
            y: this.yPos
        },
        editorID: this.editorID,
        modified: this.lastModified,
        colour: {
            r: this.colourR,
            g: this.colourG,
            b: this.colourB
        }
    };
}

PixelSchema.statics.addPixel = function(colour, x, y, userID, app, callback) {
    var pn = this;
    x = parseInt(x), y = parseInt(y);
    if(isNaN(x) || isNaN(y)) return callback(null, { message: "Invalid positions provided." });
    // TODO: Get actual position below:
    if(x < 0 || y < 0 || x >= 1400 || y >= 1400) return callback(null, { message: "Position is out of bounds." });
    this.find({
        xPos: x,
        yPos: y
    }).then((pixels) => {
        // Find the pixel at this location
        var pixel = pixels[0];
        var wasIdentical = colour.r == 255 && colour.g == 255 && colour.b == 255; // set to identical if pixel was white
        if(pixel) { // we have data from the old pixel
            wasIdentical = pixel.editorID == userID && pixel.colourR == colour.r && pixel.colourG == colour.g && pixel.colourB == pixel.colourB; // set to identical if colour matched old pixel
        }
        if(!wasIdentical) { // if the pixel was changed
            if(!pixel) { // if the spot was blank, create a new one
                pixel = pn({
                    xPos: x,
                    yPos: y
                });
            }
            // change our appropriate fields
            pixel.editorID = userID;
            pixel.colourR = colour.r;
            pixel.colourG = colour.g;
            pixel.colourB = colour.b;
            pixel.lastModified = Date();
            // save the changes
            pixel.save().then((p) => {
                callback(true, null); // report back that we changed the pixel
            }).catch((err) => {
                app.reportError("Error saving pixel for update: " + err);
                callback(null, { message: "An error occurred while trying to place the pixel." });
            })
        } else {
            // report back that we didn't change the pixel
            return callback(false, null);
        }
    }).catch((err) => {
        app.reportError("Error reading pixel for update: " + err);
        callback(null, { message: "An error occurred while trying to place the pixel." });
    });
}

PixelSchema.methods.getInfo = function(overrideDataAccess = false, app = null) {
    return new Promise((resolve, reject) => {
        let info = this.toInfo();
        require("./user").getPubliclyAvailableUserInfo(this.editorID, overrideDataAccess, app).then((userInfo) => resolve(Object.assign(info, userInfo))).catch((err) => reject(err));
    });
}

module.exports = mongoose.model("Pixel", PixelSchema);
