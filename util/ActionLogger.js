const Action = require("../models/action");

// Below are the possible actions
var actions = {
    // Normal user actions
    signIn: {
        displayName: "Sign in",
        inlineDisplayName: "Signed in",
        category: "auth"
    },
    signUp: {
        displayName: "Sign up",
        inlineDisplayName: "Signed up",
        category: "auth"
    },
    signOut: {
        displayName: "Sign out",
        inlineDisplayName: "Signed out",
        category: "auth"
    },
    changePassword: {
        displayName: "Change password",
        inlineDisplayName: "Changed password",
        category: "account"
    },
    deactivate: {
        displayName: "Deactivate own account",
        inlineDisplayName: "Deactivated their account",
        category: "account"
    },
    delete: {
        displayName: "Delete own account",
        inlineDisplayName: "Marked their account for deletion",
        category: "account"
    },
    place: {
        displayName: "Place pixel",
        inlineDisplayName: "Placed a pixel",
        category: "gameplay",
        hideInfo: true,
        sentenceEndTextFormatting: " at <a href=\"/#x=${x}&y=${y}\">(${x.toLocaleString()}, ${y.toLocaleString()})</a>"
    },
    sendChatMessage: {
        displayName: "Send chat message",
        inlineDisplayName: "Sent a chat message",
        category: "chat"
    },
    // Moderation actions
    ban: {
        displayName: "Ban user",
        inlineDisplayName: "Banned user",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    unban: {
        displayName: "Unban user",
        inlineDisplayName: "Unbanned user",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    activateOther: {
        displayName: "Activate account",
        inlineDisplayName: "Activated account",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    deactivateOther: {
        displayName: "Deactivate account",
        inlineDisplayName: "Deactivated account",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    updateNotes: {
        displayName: "Update user notes",
        inlineDisplayName: "Updated user notes for",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    disableTOTP: {
        displayName: "Disable two-factor authentication",
        inlineDisplayName: "Disabled two-factor authentication for",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    forcePWReset: {
        displayName: "Force a password reset",
        inlineDisplayName: "Forced a password reset for",
        category: "moderation",
        requiresModerator: true,
        isPrivileged: true
    },
    // Administrative actions
    deleteAccount: {
        displayName: "Delete account",
        inlineDisplayName: "Deleted",
        category: "administrative",
        isPrivileged: true
    },
    giveModerator: {
        displayName: "Give moderator",
        inlineDisplayName: "Gave moderator to",
        category: "administrative",
        requiresModerator: true,
        isPrivileged: true
    },
    removeModerator: {
        displayName: "Remove moderator",
        inlineDisplayName: "Removed moderator from",
        category: "administrative",
        requiresModerator: true,
        isPrivileged: true
    },
    reloadConfig: {
        displayName: "Reload site configuration",
        inlineDisplayName: "Reloaded site configuration",
        category: "administrative",
        isPrivileged: true
    },
    refreshClients: {
        displayName: "Refresh all clients",
        inlineDisplayName: "Refreshed all clients",
        category: "administrative",
        isPrivileged: true
    },
    sendBroadcast: {
        displayName: "Broadcast a message to all users",
        inlineDisplayName: "Broadcasted a message to all users",
        category: "administrative",
        isPrivileged: true
    }
};

var actionLogger = {
    log: function(app, actionID, performingUser, moderatingUser = null, info = null) {
        Action({
            actionID: actionID,
            performingUserID: performingUser.id,
            moderatingUserID: moderatingUser ? moderatingUser.id : null,
            info: info,
            date: new Date()
        }).save().catch((err) => app.reportError("An error occurred while trying to log action: " + err));
    },

    infoForAction: function(actionID) {
        return actions[actionID];
    },

    getAllActionInfo: function() {
        return actions;
    },

    actionIDsToRetrieve: function(modOnly = false) {
        return Object.keys(actions).filter((a) => modOnly ? actions[a].isPrivileged : true);
    }
};

module.exports = actionLogger;
