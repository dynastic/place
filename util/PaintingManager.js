const lwip = require("pajk-lwip");
const Pixel = require("../models/pixel");
const ActionLogger = require("../util/ActionLogger");

function PaintingManager(app) {
    const imageSize = app.config.boardSize;
    return {
        hasImage: false,
        imageHasChanged: false,
        image: null,
        outputImage: null,
        waitingForImages: [],
        lastPixelUpdate: null,
        firstGenerateAfterLoad: false,
        pixelsToPaint: [],

        getBlankImage: function() {
            return new Promise((resolve, reject) => {
                lwip.create(imageSize, imageSize, "white", (err, image) => {
                    if (err) return reject(err);
                    resolve(image);
                });
            });
        },

        loadImageFromDatabase: function() {
            return new Promise((resolve, reject) => {
                this.getBlankImage().then((image) => {
                    let batch = image.batch();
                    Pixel.find({}).stream().on("data", (pixel) => {
                        var x = pixel.xPos, y = pixel.yPos;
                        var colour = { r: pixel.colourR,  g: pixel.colourG, b: pixel.colourB };
                        if(x >= 0 && y >= 0 && x < imageSize && y < imageSize) batch.setPixel(x, y, colour);
                    }).on("end", () => {
                        batch.exec((err, image) => {
                            if (err) return reject(err);
                            this.hasImage = true;
                            this.image = image;
                            this.imageBatch = this.image.batch();
                            this.firstGenerateAfterLoad = true;
                            this.generateOutputImage();
                            resolve(image);
                        });
                    }).on("error", (err) => reject(err));
                }).catch((err) => reject(err));
            });
        },

        getOutputImage: function() {
            return new Promise((resolve, reject) => {
                if (this.outputImage) return resolve({image: this.outputImage, hasChanged: this.imageHasChanged, generated: this.lastPixelUpdate});
                this.waitingForImages.push((err, buffer) => {
                    this.getOutputImage().then((data) => resolve(data)).catch((err) => reject(err));
                })
            })
        },

        generateOutputImage: function() {
            var a = this;
            return new Promise((resolve, reject) => {
                this.waitingForImages.push((err, buffer) => {
                    if (err) return reject(err);
                    resolve(buffer);
                })
                if(this.waitingForImages.length == 1) {
                    this.lastPixelUpdate = Math.floor(Date.now() / 1000);
                    this.pixelsToPaint.forEach((data) => {
                        // Paint on live image:
                        this.imageBatch.setPixel(data.x, data.y, data.colour);
                    });
                    this.pixelsToPaint = [];
                    this.imageBatch.toBuffer("png", { compression: "fast", transparency: false }, (err, buffer) => {
                        a.outputImage = buffer;
                        a.imageHasChanged = false;
                        a.waitingForImages.forEach((callback) => callback(err, buffer));
                        a.waitingForImages = [];
                        if(a.firstGenerateAfterLoad) {
                            app.websocketServer.broadcast("server_ready");
                            a.firstGenerateAfterLoad = false;
                        }
                    })
                }
            })
        },

        getColourRGB: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        doPaint: function(colour, x, y, user) {
            var a = this;
            return new Promise((resolve, reject) => {
                if(!this.hasImage) return reject({message: "Server not ready", code: "not_ready"});
                if(app.temporaryUserInfo.isUserPlacing(user)) return reject({message: "You cannot place more than one tile at once.", code: "attempted_overload"});
                app.temporaryUserInfo.setUserPlacing(user, true);
                // Add to DB:
                user.addPixel(colour, x, y, app, (changed, err) => {
                    app.temporaryUserInfo.setUserPlacing(user, false);
                    if(err) return reject(err);
                    a.pixelsToPaint.push({x: x, y: y, colour: colour});
                    a.imageHasChanged = true;
                    // Send notice to all clients:
                    var info = {x: x, y: y, colour: Pixel.getHexFromRGB(colour.r, colour.g, colour.b)};
                    app.pixelNotificationManager.pixelChanged(info);
                    ActionLogger.log(app, "place", user, null, info);
                    app.userActivityController.recordActivity(user);
                    app.leaderboardManager.needsUpdating = true;
                    resolve();
                });
            });
        },

        startTimer: function() {
            setInterval(() => {
                if(this.imageHasChanged) {
                    app.logger.log('Painting Manager', "Starting board image update...");
                    this.generateOutputImage();
                } else {
                    app.logger.log('Painting Manager', "Not updating board image, no changes since last update.");
                }
            }, 30 * 1000);
        }
    };
}

PaintingManager.prototype = Object.create(PaintingManager.prototype);

module.exports = PaintingManager;
