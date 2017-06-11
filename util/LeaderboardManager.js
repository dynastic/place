const Pixel = require("../models/pixel");
const User = require("../models/user");

function LeaderboardManager(app) {
    var manager = {
        needsUpdating: true,
        topUsers: null, pixelCounts: null,
        waitingForUpdate: [],
        isUpdating: true,

        update: function() {
            if(!this.needsUpdating) return;
            console.log("Starting generation of leaderboard data...");
            this.isUpdating = true;
            this.needsUpdating = false;
            var dateBackLastWeek = new Date(new Date().getTime() - (7 * 24 * 60 * 60 * 1000));
            var pixelCounts = {};
            Pixel.find({lastModified: {$gt: dateBackLastWeek}}, {editorID: 1}).stream().on("data", pixel => {
                var uid = pixel.editorID.toString();
                if(!Object.keys(pixelCounts).includes(uid)) pixelCounts[uid] = 0;
                pixelCounts[uid]++;
            }).on("close", () => {
                this.pixelCounts = pixelCounts;
                // Get top users from pixel count, put them in sortable array, sort from greatest to least, then just extract user ID
                this.topUsers = Object.keys(pixelCounts).map(userID => [userID, pixelCounts[userID]]).sort((a, b) => b[1] - a[1]).map(a => a[0]);
                this.isUpdating = false;
                // Finish all waiting for leaderboard
                this.waitingForUpdate.forEach(callback => this.getInfo(callback));
                console.log("Generation of leaderboard data complete.");
            }).on("error", err => {
                app.reportError("Couldn't update leaderboard.");
                this.topUsers = null;
                this.pixelCounts = null;
                this.isUpdating = false;
            });
        },

        getInfo: function(callback) {
            if(this.isUpdating) return this.waitingForUpdate.push(callback);
            if(!this.topUsers || !this.pixelCounts) return callback("No leaderboard data loaded", null);
            User.find({_id: { $in: this.topUsers }}).then(users => {
                callback(null, users.filter(u => !u.banned && !u.deactivated).sort((a, b) => this.pixelCounts[b._id] - this.pixelCounts[a._id]).map(u => u.toInfo(app)))
            }).catch(err => callback(err, null));
        }
    }
    manager.update()
    setInterval(manager.update, 1000 * 60 * 3); // Update the leaderboard every 3 minutes
    return manager;
}

LeaderboardManager.prototype = Object.create(LeaderboardManager.prototype);

module.exports = LeaderboardManager;