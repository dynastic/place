const mongoose = require("mongoose");
const config = require('../config/config');
const Pixel = require('../models/pixel');

console.log('--------------------------------');
console.log('DATABASE MIGRATOR');
console.log('USE WITH EXTREME CAUTION');
console.log('PLEASE BACKUP YOUR DATABASE BEFORE RUNNING THIS TOOL');
console.log('--------------------------------');

// Flag variables
var doneReading = false;
let i = 0;
let saved = 0;

mongoose.connect(config.database).then(() => console.info('Connected to database'));

let cursor = Pixel.find().cursor();

cursor.on('data', (pixel) => {
    i++;
    
    pixel.xPos += 100
    pixel.yPos += 100
    
    pixel.save(function(err, n) {
        if (err) return console.error("Error saving pixel " + err);
        saved++;
        if (i === saved && doneReading) {
            console.log(`Updated ${i} pixels`);
            process.exit();
        }
    });
});

cursor.on('close', function() {
    doneReading = true;
});

cursor.on('error', function(err) {
    console.error("Error saving pixel " + err);
});