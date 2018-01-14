module.exports = {
    usersPlacing: [], 

    setUserPlacing: function(user, isPlacing) {
        if(this.isUserPlacing(user) == isPlacing) return;
        if(isPlacing) {
            this.usersPlacing.push(user.id);
        } else {
            let userIndex = this.usersPlacing.indexOf(user.id);
            if(userIndex > -1) this.usersPlacing.splice(userIndex, 1);
        }
    },

    isUserPlacing: function(user) {
        return this.usersPlacing.includes(user.id);
    }
};