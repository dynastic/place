const User = require("../models/user");

function UserActivityManager(app) {
    var controller = {
        userActivityTimes: {},

        update: function() {
            var pastTime = new Date().getTime() - (1000 * 60 * 5); // active users last did something in three minute span
            this.userActivityTimes = Object.keys(this.userActivityTimes).filter((u) => this.userActivityTimes[u] > pastTime).splice(0, 25).reduce((obj, key) => {
                obj[key] = this.userActivityTimes[key];
                return obj;
            }, {});
            app.logger.log('User Activity', "Updated user activity manager stored data.")
        },

        recordActivity: function(user) {
            this.userActivityTimes[user.id] = new Date().getTime();
        },

        getInfo: function() {
            return new Promise((resolve, reject) => {
                User.find({_id: { $in: Object.keys(this.userActivityTimes).splice(0, 25) }}).then(users => {
                    var info = users.sort((a, b) => this.userActivityTimes[b._id] - this.userActivityTimes[a._id]).map(u => u.toInfo(app));
                    resolve(info);
                }).catch((err) => reject(err));
            });
        }
    };
    setInterval(() => controller.update(), 1000 * 15); // 15 second update intervals
    return controller;
}

UserActivityManager.prototype = Object.create(UserActivityManager.prototype);

module.exports = UserActivityManager;