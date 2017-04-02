const lwip = require('lwip');

function PaintingHandler() {
    return {
        hasImage: false,

        getBlankImage: function() {
            return new Promise((resolve, reject) => {
                lwip.create(1024, 1024, "white", function(err, image) {
                    if(err) return reject(err);
                    resolve(image);
                });
            });
        },

        loadImageFromDatabase: function() {
            return new Promise((resolve, reject) => {
                let image = this.getBlankImage().then((image) => {
                    this.hasImage = true;
                    resolve(image);
                }).catch(err => {
                    reject(err);
                })
            });
        }
    }
}

PaintingHandler.prototype = Object.create(PaintingHandler.prototype);

module.exports = PaintingHandler;