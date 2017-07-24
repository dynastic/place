const mongoose = require("mongoose");
const config = require('../config/config');
const Pixel = require('../models/pixel');

console.log('--------------------------------');
console.log('DATABASE MIGRATOR');
console.log('USE WITH EXTREME CAUTION');
console.log('PLEASE BACKUP YOUR DATABASE BEFORE RUNNING THIS TOOL');
console.log('--------------------------------');

mongoose.connect(config.database).then(() => console.info('Connected to database'));

let cursor = Pixel.find().cursor();

cursor.on('data', (pixel) => {
    let o = pixel;

    pixel.xPos = o.xPos += 200
    pixel.yPos = o.yPos += 200
    
    pixel.save((err, n) => {
        if (err) return console.error("Error saving pixel " + err);
        console.log(`Updated pixel (${o.xPos}, ${o.yPos}) to (${pixel.xPos}, ${pixel.yPos})`);
    });
});

cursor.on('close', function() {
    console.log("Done shifting pixels");
    process.exit();
});

cursor.on('error', function(err) {
    console.error("Error saving pixel " + err);
});