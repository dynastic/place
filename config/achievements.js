const olderThan = (date = Date.now(), time = {milliseconds: 0, seconds: 0, minutes: 0, hours: 0, days: 0, weeks: 0, months: 0, years: 0}) => {
    let computedTime = Date.now();
    if (time.milliseconds) {
        computedTime -= time.milliseconds;
    }
    if (time.seconds) {
        computedTime -= time.seconds * 1000;
    }
    if (time.minutes) {
        computedTime -= time.minutes * 1000 * 60;
    }
    if (time.hours) {
        computedTime -= time.hours * 1000 * 60 * 60;
    }
    if (time.days) {
        computedTime -= time.days * 1000 * 60 * 60 * 24;
    }
    if (time.weeks) {
        computedTime -= time.weeks * 1000 * 60 * 60 * 24 * 7;
    }
    if (time.months) {
        let cTime = new Date();
        cTime.setTime(Date.now() - computedTime);
        const newMonths = cTime.getMonth() + time.months;
        cTime.setMonth(newMonths);
        computedTime = cTime.getTime();
    }
    if (time.years) {
        computedTime -= time.years * 1000 * 60 * 60 * 24 * 365;
    }
    console.log("Minimum: " + computedTime);
    console.log("Date: " + date);
    return computedTime > date;
};

module.exports = [
    // User has placed at least five pixels
    {
        name: "First Pixel!",
        description: "You've placed one pixel!",
        imageURL: null,
        meetsCriteria(user) {
            return user.placeCount >= 1;
        }
    },
    {
        name: "Ten Pixels!",
        description: "Congrats on hitting ten pixels! Keep it going!",
        imageURL: null,
        meetsCriteria(user) {
            return user.placeCount >= 10;
        }
    },
    {
        name: "100 Pixels!",
        description: "W00T! Let's go let's go let's go!!! Get to 1000 pixels!",
        imageURL: null,
        meetsCriteria(user) {
            return user.placeCount >= 100;
        }
    },
    {
        name: "1000 Pixels!",
        description: "I see you, placing those pixels all sexy 'n shit.",
        imageURL: null,
        meetsCriteria(user) {
            return user.placeCount >= 1000;
        }
    },
    {
        name: "Addict",
        description: "People can safely default to assuming you're on canvas.place",
        imageURL: null,
        meetsCriteria(user) {
            return user.placeCount >= 10000;
        }
    },
    {
        name: "Ultra-Addict",
        description: "You play canvas.place so much, you should just run the website.",
        imageURL: null,
        meetsCriteria(user) {
            return user.placeCount >= 50000;
        }
    },
    {
        name: "Beginner",
        description: "You're just starting out, but don't fret. You're going great places.",
        imageURL: null,
        meetsCriteria(user) {
            return olderThan(user.creationDate, {days: 1});
        }
    },
    {
        name: "Novice",
        description: "You're wiser than the average fellow but have much left to learn.",
        imageURL: null,
        meetsCriteria(user) {
            return olderThan(user.creationDate, {weeks: 1});
        }
    },
    {
        name: "Intermediate",
        description: "You're getting the hang of it! Keep at it.",
        imageURL: null,
        meetsCriteria(user) {
            return olderThan(user.creationDate, {months: 1});
        }
    },
    {
        name: "Advanced",
        description: "You've got it! I consider you to be proficient at the art of placing.",
        imageURL: null,
        meetsCriteria(user) {
            return olderThan(user.creationDate, {months: 6});
        }
    },
    {
        name: "Expert",
        description: "You're better than me, so..",
        imageURL: null,
        meetsCriteria(user) {
            return olderThan(user.creationDate, {years: 1});
        }
    }
];