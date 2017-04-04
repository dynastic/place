const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const Pixel = require('./pixel');
const config = require("../config/config");

var UserSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    creationDate: {
        type: Date,
        required: true
    },
    lastPlace: {
        type: Date,
        required: false
    },
    admin: {
        type: Boolean,
        required: true
    }
});

UserSchema.pre('save', function(next) {
    let user = this;
    if (this.isModified('password') || this.isNew) {
        bcrypt.genSalt(10, function(err, salt) {
            if (err) return next(err);
            bcrypt.hash(user.password, salt, function(err, hash) {
                if (err) return next(err);
                user.password = hash;
                next();
            });
        });
    } else {
        return next();
    }
});

UserSchema.methods.comparePassword = function(passwd, cb) {
    bcrypt.compare(passwd, this.password, function(err, isMatch) {
        if (err) return cb(err);
        cb(null, isMatch);
    });
}

UserSchema.methods.toInfo = function() {
    return {
        id: this.id,
        username: this.name,
        creationDate: this.creationDate
    }
}

UserSchema.statics.register = function(username, password, callback) {
    if (!this.isValidUsername(username)) return callback(null, { message: "That username cannot be used. Usernames must be 3-20 characters in length and may only consist of letters, numbers, underscores, and dashes.", code: "username_taken" });
    let newUser = this({
        name: username,
        password: password,
        creationDate: Date(),
        admin: false
    });
    // Save the user
    newUser.save(function(err) {
        if (err) return callback(null, { message: "That username already exists.", code: "username_taken" });
        return callback(newUser, null)
    });
}

UserSchema.statics.isValidUsername = function(username) {
    return /^[a-zA-Z0-9-_]{3,20}$/.test(username);
}

UserSchema.methods.addPixel = function(colour, x, y, callback) {
    var user = this;
    Pixel.addPixel(colour, x, y, this.id, (pixel, error) => {
        if (!pixel) return callback(null, error);
        user.lastPlace = new Date();
        user.save(function(err) {
            if (err) return callback(null, { message: "An unknown error occurred while trying to place that pixel." });
            return callback(pixel, null);
        })
    });
}

UserSchema.methods.getPlaceSecondsRemaining = function() {
    if (this.lastPlace) {
        let current = new Date().getTime();
        let place = this.lastPlace.getTime();
        // Seconds since last place
        let diffSeconds = (current - place) / 1000;
        // Seconds before can place again
        let remainSeconds = Math.min(config.placeTimeout, Math.max(0, config.placeTimeout - diffSeconds));
        return Math.ceil(remainSeconds);
    }
    return 0;
}

UserSchema.methods.canPlace = function() {
    return this.getPlaceSecondsRemaining() <= 0;
}

module.exports = mongoose.model('User', UserSchema);