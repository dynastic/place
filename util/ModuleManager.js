const fs = require("fs-extra-promise");
const path = require('path');
const modulesDirectory = path.resolve(`${__dirname.replace(/\/\w+$/, ``)}/modules/`);
const express = require("express");

// Heavily inspired by EricRabil's work on DDBot.

class ModuleManager {
    constructor(app) {
        this.app = app;
        this.modules = new Map();
        this.moduleMetas = {};
        this.modulePaths = {};
        this.moduleIdentifiers = [];

        this.loadingCallbacks = [];
        this.loaded = false;
    }

    load(meta, mainPath) {
        var validDependencies = true;
        var withoutConflicts = true;
        // Check dependency modules
        meta.depends.every((dependency) => {
            if(!this.moduleIdentifiers.includes(directory)) {
                validDependencies = false;
                return false;
            }
            return true;
        });
        if(!validDependencies) return console.error(`Couldn't load module "${meta.name}" (${meta.identifier}) because it depends on a module with the identifier "${meta.identifier}."`);
        // Check conflicting modules
        meta.conflicts.every((conflict) => {
            if(this.moduleIdentifiers.includes(directory)) {
                withoutConflicts = false;
                return false;
            }
            return true;
        })
        if(!withoutConflicts) return console.error(`Couldn't load module "${meta.name}" (${meta.identifier}) because it conflicts with a module with the identifier "${meta.identifier}".`);
        // Make sure there isn't already one loaded
        if(this.modules.has(meta.identifier)) return console.error(`Couldn't load module "${meta.name}" (${meta.identifier}) because another module with the same identifier was already loaded.`);
        // Initialize the module
        this.moduleMetas[meta.identifier] = meta;
        this.modulePaths[meta.identifier] = path.dirname(mainPath);
        var Module = require(mainPath);
        var newModule = new Module(this.app);
        this.modules.set(meta.name, newModule);
        console.log(`Loaded module "${meta.name}" (${meta.identifier}).`);
    }

    loadAll() {
        console.log("Starting load of modules...");
        fs.readdir(modulesDirectory, (err, files) => {
            if(err) return this.app.reportError("Error loading modules: " + err);
            if(files.length <= 0) return console.log("No modules loaded.");
            // Try and load information about all the modules
            var promises = files.map((file) => this.processModuleLoadingInformation(file));
            Promise.all(promises).then(moduleInfo => {
                // Remove nulls and sort by priority
                moduleInfo = moduleInfo.filter((o) => !!o).sort((a, b) => b.priority - a.priority); 
                this.moduleIdentifiers = moduleInfo.map((info) => info.identifier);
                moduleInfo.forEach((info) => this.load(info.meta, info.main));
                this.loaded = true;
                this.loadingCallbacks.forEach((callback) => callback(this));
            }).catch(err => this.app.reportError("Error loading modules: " + err));
        });
    }

    fireWhenLoaded(callback) {
        if(this.loaded) return callback(this);
        this.loadingCallbacks.push(callback);
    }

    processModuleLoadingInformation(file) {
        return new Promise((resolve, reject) => {
            var folderPath = path.join(modulesDirectory, file);
            fs.stat(folderPath, (err, stat) => {
                if(err) {
                    this.app.reportError("Error loading single module directory: " + err);
                    return resolve(null);
                }
                if(!stat.isDirectory()) return;
                var folder = path.parse(folderPath);
                var nicePath = path.join(folder.dir, folder.base);
                // Attempt to stat module.json
                fs.stat(path.join(nicePath, "module.json"), (err) => {
                    if(err) {
                        console.error(`Skipping malformed module "${folder.name}" (error loading module.json).`);
                        return resolve(null);
                    }
                    var moduleMeta = require(path.join(nicePath, "module.json"));
                    if(!moduleMeta.main || !moduleMeta.identifier || !moduleMeta.name) return console.error(`Skipping malformed module "${folder.name}" (invalid module.json).`);
                    moduleMeta = this.addMetaDefaults(moduleMeta);
                    // Attempt to stat main module JS file
                    fs.stat(path.join(nicePath, moduleMeta.main), (err) => {
                        if(err) {
                            console.error(`Skipping malformed module "${folder.name}" (error loading main file).`);
                            return resolve(null);
                        }
                        // Success, load it
                        resolve({meta: moduleMeta, main: path.join(nicePath, moduleMeta.main)});
                    });
                });
            });
        });
    }

    addMetaDefaults(meta) {
        if(!meta.priority) meta.priority = 1;
        if(!meta.routes) meta.routes = [];
        if(!meta.depends) meta.depends = [];
        if(!meta.conflicts) meta.conflicts = [];
        if(!meta.publicRoot) meta.publicRoot = "/";
        return meta;
    }

    // --- Resource Loading ---

    getResourcesFromModules(req) {
        var resources = { css: [], js: [] };
        this.modules.forEach((module) => {
            if(typeof module.getCSSResourceList === "function") resources.css = resources.css.concat(module.getCSSResourceList(req));
            if(typeof module.getJSResourceList === "function") resources.js = resources.js.concat(module.getJSResourceList(req));
        });
        return resources;
    }

    // --- Static File Serving ---

    registerPublicDirectories(server, callback) {
        var promises = Object.keys(this.moduleMetas).map((module) => this.getRegisteredPublicDirectories(this.moduleMetas[module], server));
        Promise.all(promises).then(directories => {
            directories.filter((o) => !!o).forEach((o) => server.use(o.root, o.middleware));
            callback();
        }).catch(err => this.app.reportError("Error loading public directories for modules: " + err));
    }

    getRegisteredPublicDirectories(meta, server) {
        return new Promise((resolve, reject) => {
            var publicPath = path.join(this.modulePaths[meta.identifier], "public");
            fs.stat(publicPath, (err, stat) => {
                if(err || !stat.isDirectory()) return resolve(null);
                resolve({root: meta.publicRoot, middleware: express.static(publicPath)});
            });
        });
    }
}

ModuleManager.prototype = Object.create(ModuleManager.prototype);

module.exports = ModuleManager;