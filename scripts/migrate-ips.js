const mongoose = require("mongoose");
const config = require('../config/config');
const Access = require('../models/access');

console.log('--------------------------------');
console.log('DATABASE MIGRATOR');
console.log('USE WITH EXTREME CAUTION');
console.log('PLEASE BACKUP YOUR DATABASE BEFORE RUNNING THIS TOOL');
console.log('--------------------------------');

// Flag variables
var doneReading = false;
let saved = 0;
let i = 0;

mongoose.connect(config.database, {useMongoClient: true}).then(() => console.info('Connected to database'));
mongoose.Promise = global.Promise;

const query = { $and: [ { ipAddress: { $ne: null }, hashedIPAddress: null } ] };
let cursor = Access.find(query).cursor();

let count = 0;
Access.count(query).then(c => {
    count = c;
    const printStatus = () => {
        const rawPercentage = saved / count;
        console.log(`We've updated ${rawPercentage * 100}% of the access records`);
    }
    setInterval(() => printStatus(), 15000);
});

cursor.on('data', (record) => {
    i++;

    record.migrateIPAddress().then((n) => {
        saved++;
        if (i === saved && doneReading) {
            console.log(`Updated ${i} access records`);
            process.exit();
        }
    }).catch((err) => console.error("Error saving access record", err));
});

cursor.on('close', function() {
    doneReading = true;
});

cursor.on('error', function(err) {
    console.error("Error saving access record", err);
});
