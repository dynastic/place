const mongoose = require("mongoose");
const config = require('../config/config');
const Pixel = require('../models/pixel');

console.log('--------------------------------');
console.log('DATABASE MIGRATOR');
console.log('USE WITH EXTREME CAUTION');
console.log('PLEASE BACKUP YOUR DATABASE BEFORE RUNNING THIS TOOL');
console.log('--------------------------------');

mongoose.connect(config.database).then(() => console.info('Connected to database'));

Pixel.find({}, (err, pixels) => {
    if (err) return console.error("Could not get pixels with error " + err);
    pixels.forEach((pixel) => {
        pixel.xPos = pixel.xPos += 200
        pixel.yPos = pixel.yPos += 200
        pixel.save((err) => { 
            if (err) return console.error("Error saving pixel " + err);
        });
    });
    console.log("Done shifting pixels");
    process.exit();
});
