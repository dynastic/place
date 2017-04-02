const lwip = require('lwip');
const imageSize = 1000;

function PaintingHandler() {
    return {
        hasImage: false, imageHasChanged: false,
        image: null,
        outputImage: null,

        getBlankImage: function() {
            return new Promise((resolve, reject) => {
                lwip.create(imageSize, imageSize, "white", function(err, image) {
                    if(err) return reject(err);
                    resolve(image);
                });
            });
        },

        loadImageFromDatabase: function() {
            return new Promise((resolve, reject) => {
                let image = this.getBlankImage().then((image) => {
                    this.hasImage = true;
                    this.image = image;
                    resolve(image);
                }).catch(err => {
                    reject(err);
                })
            });
        },

        getOutputImage: function() {
            return new Promise((resolve, reject) => {
                if(this.outputImage && !this.imageHasChanged) return resolve(this.outputImage);
                console.log("Generating new output image!");
                this.generateOutputImage().then((outputImage) => resolve(outputImage)).catch((err) => reject(err));
            })
        },

        generateOutputImage: function() {
            var a = this;
            return new Promise((resolve, reject) => {
                this.image.toBuffer("png", {compression: "fast", transparency: false}, function(err, buffer) {
                    if(err) return reject(err);
                    a.outputImage = buffer;
                    a.imageHasChanged = false;
                    resolve(buffer);
                })
            })
        }
    }
}

PaintingHandler.prototype = Object.create(PaintingHandler.prototype);

module.exports = PaintingHandler;