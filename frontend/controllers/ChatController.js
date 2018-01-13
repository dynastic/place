const ChatMessage = require("../models/chatMessage");
const ActionLogger = require("../util/ActionLogger")

exports.getAPIChat = (req, res, next) => {
    ChatMessage.getLatestMessages().then((messages) => {
        var overrideDataAccess = req.user && (req.user.moderator || req.user.admin);
        var promises = messages.reverse().map((m) => m.getInfo(overrideDataAccess));
        Promise.all(promises).then((messages) => {
            // Removed banned users' messages if we're not mod
            if(overrideDataAccess !== true) messages = messages.filter((m) => (!m.user || !m.user.banned) && (m.userError != "ban"));
            res.json({ success: true, messages: messages });
        }).catch((err) => res.status(500).json({ success: false }));
    }).catch((err) => res.status(500).json( { success: false }))
};

exports.postAPIChatMessage = (req, res, next) => {
    if(!req.body.text || !req.body.x || !req.body.y) return res.status(400).json({ success: false, error: { message: "You did not specify the required information to send a message.", code: "bad_request" } });
    if(req.body.text.length < 1 || req.body.text.length > 250) return  res.status(400).json( { success: false, error: { message: "Your message must be shorter than 250 characters and may not be blank.", code: "message_text_length" } });
    ChatMessage.createMessage(req.place, req.user.id, req.body.text, req.body.x, req.body.y).then((message) => {
        message.getInfo().then((info) => {
            res.json({ success: true, message: info });
            req.place.userActivityController.recordActivity(req.user);
            ActionLogger.log(req.place, "sendChatMessage", req.user, null, { messageID: info.id });
            req.place.websocketServer.broadcast("new_message", info);
        }).catch((err) => res.json({ success: true }))
    }).catch((err) => {
        req.place.reportError(err);
        res.status(500).json( { success: false, error: { message: "An error occurred while trying to send your message.", code: "server_message_error" } })
    });
};
