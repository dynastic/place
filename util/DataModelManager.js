const mongoose = require("mongoose");

class DataModelManager {
    constructor(app) {
        this.app = app;
        this.registeredModels = new Map();
        this.modelStaticMethods = {};
        this.modelInstanceMethods = {};
        this.modelStaticMethodOverrides = {};
        this.modelInstanceMethodOverrides = {};
    }

    registerModel(name, prototype) {
        var m = this;
        var needsInitialization = !this.registeredModels.has(name);
        if(needsInitialization) {
            Object.keys(prototype.statics).forEach((key) => {
                var method = prototype.statics[key];
                this._registerMethodHandler(name, key, true, method);
                prototype.statics[key] = function() {
                    return m._getMethodHandler(name, key, true).apply(this, Array.from(arguments))
                }
            });
        }
        var model = mongoose.model(name, this.registeredModels.get(name) || prototype);
        if(needsInitialization) {
            Object.keys(prototype.methods).forEach((key) => {
                var method = mongoose.models[name].prototype[key];
                this._registerMethodHandler(name, key, false, method);
                this._setupMethodHandler(name, key, false);
            });
        }
        return model;
    }

    registerModuleOverrides(name, override) {
        // Make sure we have objects in our object for this model override
        if(!this.modelInstanceMethods[name]) this.modelInstanceMethods[name] = {};
        if(!this.modelStaticMethods[name]) this.modelStaticMethods[name] = {};
        if(!this.modelInstanceMethodOverrides[name]) this.modelInstanceMethodOverrides[name] = {};
        if(!this.modelStaticMethodOverrides[name]) this.modelStaticMethodOverrides[name] = {};
        // Loop through the added instance methods, and set them up to work
        Object.keys(override.methods).forEach((key) => {
            this.modelInstanceMethods[name][key] = override.methods[key];
            this._setupMethodHandler(name, key, false);
        });

        // TODO: Loop statics, find where mongoose stores its static shit, set it there (set it to go through _getMethodHandler)
        
        // Store static and instance methods internally for use later
        Object.keys(override.hookMethods).forEach((key) => this.modelInstanceMethodOverrides[name][key] = override.hookMethods[key]);
        Object.keys(override.hookStatics).forEach((key) => this.modelStaticMethodOverrides[name][key] = override.hookStatics[key]);
    }

    _setupMethodHandler(name, key, isStatic) {
        if(isStatic) return;
        mongoose.models[name].prototype[key] = function() {
            return m._getMethodHandler(name, key, false).apply(this, Array.from(arguments));
        }
    }

    _getList(isStatic) {
        return isStatic ? this.modelStaticMethods : this.modelInstanceMethods;
    }

    _getMethodHandler(model, name, isStatic) {
        console.log(`Getting method handler ${model}/${name} (${isStatic ? "static" : "instance"})`)
        return this._getList(isStatic)[model][name];
    }

    _registerMethodHandler(model, name, isStatic, handler) {
        if(!this._getList(isStatic)[model]) this._getList(isStatic)[model] = [];
        this._getList(isStatic)[model][name] = handler;
    }
}

const instance = new DataModelManager();
Object.freeze(instance);

module.exports = instance;