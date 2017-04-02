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
    colorR: {
        type: String,
        required: true
    },
    colorG: {
        type: String,
        required: true
    },
    colorB: {
        type: String,
        required: true
    }
});

PixelSchema.methods.toInfo = function() {
    return {
        x = this.xpos,
        y = this.ypos,
        editorID = this.editorID,
        modified = this.modificationTime
    }
}

module.exports = mongoose.model('Pixel', PixelSchema);
