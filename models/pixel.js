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
    x = parseInt(x), y = parseInt(y);
    if(isNaN(x) || isNaN(y)) return callback(null, { message: "Invalid positions provided." });
    // TODO: Get actual position below:
    if(x < 0 || y < 0 || x >= 1000 || y >= 1000) return callback(null, { message: "Position is out of bounds." });
    this.findOneAndUpdate({
        xPos: x,
        yPos: y
    }, {
        editorID: userID,
        colourR: colour.r,
        colourG: colour.g,
        colourB: colour.b,
        lastModified: Date()
    }, {
        upsert: true
    }, function(err, pixel) {
        if (err) return callback(null, { message: "An error occurred while trying to place the pixel." });
        var wasIdentical = colour.r == 255 && colour.g == 255 && colour.b == 255; // set to identical if pixel was white
        if(pixel) { // we have data from the old pixel
            wasIdentical = pixel.colourR == colour.r && pixel.colourG == colour.g && pixel.colourB; // set to identical if colour matched old pixel
        }
        return callback(!wasIdentical, null);
    });
}

PixelSchema.methods.getInfo = function() {
    return new Promise((resolve, reject) => {
        let info = this.toInfo();
        require("./user").findById(this.editorID).then(user => {
            info.editor = user.toInfo();
            resolve(info);
        }).catch(err => resolve(info));
    })
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