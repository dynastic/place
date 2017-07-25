class PixelNotificationManager {
    constructor(app) {
        this.app = app;
        this.updatesToAnnounce = [];
        setInterval(() => this.tick(), 1000);
    }

    pixelChanged(info) {
        this.updatesToAnnounce.push(info);
    }

    tick() {
        if (this.updatesToAnnounce.length == 1) {
            this.app.websocketServer.broadcast("tile_placed", this.updatesToAnnounce[0]);
        } else if (this.updatesToAnnounce.length > 1) {
            this.app.websocketServer.broadcast("tiles_placed", {pixels: this.updatesToAnnounce});
        }
        this.updatesToAnnounce = [];
    }
}

PixelNotificationManager.prototype = Object.create(PixelNotificationManager.prototype);

module.exports = PixelNotificationManager;