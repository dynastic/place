const path = require("path");
const fs = require("fs");
const marked = require("./Markdown")

const changelogsPath = path.join(__dirname, "..", "changelogs");

class ChangelogManager {
    constructor(app) {
        this.app = app;
        this.changelogs = [];
        this._fetchChangelogs();
    }

    _fetchChangelogs() {
        if (this.app.config.enableChangelogs) {
            this.app.logger.info("Changelogs", `Starting load of changelogs…`);
            fs.readdir(changelogsPath, (err, files) => {
                let changelogs = [];
                if (err) return this.app.logger.error("Changelogs", "Couldn't load changelogs: " + err);
                files.filter((name) => name.split(".").pop() == "json").forEach((name) => {
                    const fullPath = path.join(changelogsPath, name);
                    const changelogData = require(fullPath);
                    if (changelogData["date"] && changelogData["text"]) {
                        const version = {
                            version: Number.parseInt(name),
                            html: marked(changelogData["text"]),
                            date: changelogData["date"]
                        };
                        changelogs.push(version);
                    }
                });
                this.changelogs = changelogs.sort((a, b) => b.version - a.version);
                this.app.logger.info("Changelogs", `Successfully loaded ${changelogs.length} changelog${changelogs.length == 1 ? "" : "s"}!`);
                setTimeout(() => this._fetchChangelogs(), 30000);
            });
        } else {
            this.changelogs = [];
            setTimeout(() => this._fetchChangelogs(), 30000);
        }
    }

    // Convenience Functions:

    getChangelogs() {
        return this.changelogs;
    }

    getChangelogCount() {
        return this.changelogs.length;
    }

    getLatestChangelog() {
        return this.getChangelogs()[0];
    }

    getLatestChangelogVersion() {
        return this.getChangelogVersions()[0];
    }

    getChangelogVersions() {
        return this.getChangelogs().map((c) => c.version);
    }

    getChangelog(version) {
        return this.getChangelogs().find((c) => c.version == version);
    }

    getChangelogsSince(version) {
        return this.getChangelogs().filter((c) => c.version > version);
    }

    getChangelogsBefore(version) {
        return this.getChangelogs().filter((c) => c.version < version);
    }

    getPaginationInfo(version, forceDisableNext = false) {
        if (!version) {
            return {};
        }
        const versions = this.getChangelogVersions();
        const previous = versions.find((c) => c < version);
        const next = forceDisableNext ? null : versions.find((c) => c > version);
        return { next, previous };
    }
}

ChangelogManager.prototype = Object.create(ChangelogManager.prototype);

module.exports = ChangelogManager;