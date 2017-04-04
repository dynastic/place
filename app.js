const responseFactory = require("./util/responseFactory");
const config = require('./config/config');
const mongoose = require('mongoose');
const paintingHandler = require("./util/PaintingHandler");
const recaptcha = require('express-recaptcha');
const HTTPServer = require("./util/HTTPServer.js");
const WebsocketServer = require("./util/WebsocketServer.js");

var app = {};

app.config = config;

// Get image handler
app.paintingHandler = paintingHandler();
console.log("Loading image from the database...")
app.paintingHandler.loadImageFromDatabase().then((image) => {
    console.log("Successfully loaded image from database.");
}).catch(err => {
    console.error("An error occurred while loading the image from the database.\nError: " + err);
})

// Set up reCaptcha
recaptcha.init(config.recaptcha.siteKey, config.recaptcha.secretKey);
app.recaptcha = recaptcha;

app.httpServer = new HTTPServer(app);
app.websocketServer = new WebsocketServer(app, app.httpServer);
mongoose.connect(config.database);

app.httpServer.start();