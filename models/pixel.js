const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

var PixelSchema = new Schema({
    xPos: {
        type: Int,
        required: true
    },
    yPos: {
        type: Int,
        required: true
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
        type: Int,
        required: true
    },
    colourG: {
        type: Int,
        required: true
    },
    colourB: {
        type: Int,
        required: true
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

module.exports = mongoose.model('Pixel', PixelSchema);
