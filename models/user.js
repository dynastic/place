const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const Pixel = require('./pixel');

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
        creationDate: Date()
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
    Pixel.addPixel(colour, x, y, this.id, callback);
}

module.exports = mongoose.model('User', UserSchema);