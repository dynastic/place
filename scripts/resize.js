const mongoose = require("mongoose");
const config = require('../config/config');
const Pixel = require('../models/pixel');

console.log('--------------------------------');
console.log('DATABASE MIGRATOR');
console.log('USE WITH EXTREME CAUTION');
console.log('PLEASE BACKUP YOUR DATABASE BEFORE RUNNING THIS TOOL');
console.log('--------------------------------');

mongoose.connect(config.database).then(() => console.info('Connected to database'));

Pixel.find({}).stream().on("data", (pixel) => {
    pixel.xPos = pixel.xPos += 200
    pixel.yPos = pixel.yPos += 200
    pixel.save((err) => { 
        if (err) return console.error("Error saving pixel " + err);
    });
}).on("end", () => {
    console.log('Finished migrating pixels');
    process.exit();
}).on("error", (err) => console.error(err));

