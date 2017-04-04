const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

var colourPieceValidator = function(c) {
    return Number.isInteger(c) && c >= 0 && c <= 255;
}

var PixelSchema = new Schema({
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
            message: '{VALUE} is not a valid colour'
        }
    },
    colourG: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: '{VALUE} is not a valid colour'
        }
    },
    colourB: {
        type: Number,
        required: true,
        validate: {
            validator: colourPieceValidator,
            message: '{VALUE} is not a valid colour'
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
    }
}

PixelSchema.statics.addPixel = function(colour, x, y, userID, callback) {
    // Maybe do some validation
    x = parseInt(x), y = parseInt(y);
    if(isNaN(x) || isNaN(y)) return callback(null, { message: "Invalid positions provided." });
    // TODO: Get actual position below:
    if(x < 0 || y < 0 || x > 1000 || y > 1000) return callback(null, { message: "Position is out of bounds." });
    this.findOneAndUpdate({
        xPos: x,
        yPos: y
    }, {
        xPos: x,
        yPos: y,
        editorID: userID,
        colourR: colour.r,
        colourG: colour.g,
        colourB: colour.b,
        lastModified: Date()
    }, {
        new: true,
        upsert: true
    }, function(err, pixel) {
        if (err) return callback(null, { message: "An error occurred while trying to place the pixel." });
        return callback(pixel, null);
    });
}

PixelSchema.statics.getAllPixels = function() {
    return new Promise((resolve, reject) => {
        this.find({}, function(err, pixels) {
            if (!pixels) return reject(err);
            let info = pixels.map(pixel => pixel.toInfo())
            resolve(info)
        });
    });
}

module.exports = mongoose.model('Pixel', PixelSchema);