const mongoose = require("mongoose");

class DataModelManager {
    constructor() {
        this.registeredModels = new Map();
        this.registeredModules = new Set();
        this.modelStaticMethods = {};
        this.modelInstanceMethods = {};
        this.modelStaticMethodOverrides = {};
        this.modelInstanceMethodOverrides = {};
        this.modelFields = {};
    }

    registerModel(name, prototype) {
        var m = this;
        // Check if we've already initialized this model
        var needsInitialization = !this.registeredModels.has(name);
        if(needsInitialization) {
            // Add original model static methods to our manager for later, and change them in the model to call the manager.
            Object.keys(prototype.statics).forEach((key) => {
                var method = prototype.statics[key];
                this._registerMethodHandler(name, key, true, method);
                prototype.statics[key] = function() {
                    return m._getMethodHandler(name, key, true).apply(this, Array.from(arguments))
                }
            });
            prototype.options.strict = false;
        }
        if(this.modelFields[name]) prototype.add(this.modelFields[name]);
        var model = mongoose.model(name, this.registeredModels.get(name) || prototype);
        if(needsInitialization) {
            // Add original model instance methods to our manager for later, and change them in the model to call the manager.
            Object.keys(prototype.methods).forEach((key) => {
                var method = mongoose.models[name].prototype[key];
                this._registerMethodHandler(name, key, false, method);
                this._setupMethodHandler(name, key, false);
            });
            // Add methods that we've declared in modules to the model.
            var methodsToAdd = this.modelInstanceMethods[name];
            if(methodsToAdd) Object.keys(methodsToAdd).forEach((key) => {
                this._setupMethodHandler(name, key, false);
            });
        }
        return model;
    }

    registerModuleOverrides(name, override) {
        if(this.registeredModules.has(name)) return;
        this.registeredModules.add(name);
        if(override.schemaName) name = override.schemaName;
        // Make sure we have objects in our object for this model override
        if(!this.modelFields[name]) this.modelFields[name] = {};
        if(!this.modelInstanceMethods[name]) this.modelInstanceMethods[name] = {};
        if(!this.modelStaticMethods[name]) this.modelStaticMethods[name] = {};
        if(!this.modelInstanceMethodOverrides[name]) this.modelInstanceMethodOverrides[name] = {};
        if(!this.modelStaticMethodOverrides[name]) this.modelStaticMethodOverrides[name] = {};
        // Loop through the added instance methods, and set them up to work
        Object.keys(override.methods).forEach((key) => {
            if(!this.modelInstanceMethods[name][key]) this.modelInstanceMethods[name][key] = [];
            this.modelInstanceMethods[name][key].push(override.methods[key]);
            this._setupMethodHandler(name, key, false);
        });

        // TODO: Loop statics, find where mongoose stores its static shit, set it there (set it to go through _getMethodHandler)
        
        // Store fields, static methods, and instance methods internally for use later
        Object.keys(override.fields).forEach((key) => {
            if(!this.modelFields[name][key]) this.modelFields[name][key] = [];
            this.modelFields[name][key].push(override.fields[key]);
        });
        Object.keys(override.hookMethods).forEach((key) => {
            if(!this.modelInstanceMethodOverrides[name][key]) this.modelInstanceMethodOverrides[name][key] = [];
            this.modelInstanceMethodOverrides[name][key].push(override.hookMethods[key]);
        });
        Object.keys(override.hookStatics).forEach((key) => {
            if(!this.modelStaticMethodOverrides[name][key]) this.modelStaticMethodOverrides[name][key] = [];
            this.modelStaticMethodOverrides[name][key].push(override.hookStatics[key]);
        });
    }

    _setupMethodHandler(name, key, isStatic) {
        if (isStatic) return;
        let m = this;
        if(!mongoose.models[name]) return;
        mongoose.models[name].prototype[key] = function() {
            return m._getMethodHandler(name, key, false).apply(this, Array.from(arguments));
        }
    }

    _getList(isStatic) {
        return isStatic ? this.modelStaticMethods : this.modelInstanceMethods;
    }

    _getMethodHandler(model, name, isStatic) {
        var res = this._getList(isStatic)[model][name].slice();
        if (res.length <= 1) return res[0];
        res.reverse();
        return function() {
            var args = Array.from(arguments);
            var index = 1;
            args.push(() => {
                if(!res[index]) return;
                index++;
                return res[index - 1].apply(this, args);
            });
            return res[0].apply(this, args);
        }
    }

    _registerMethodHandler(model, name, isStatic, handler) {
        if(!this._getList(isStatic)[model]) this._getList(isStatic)[model] = [];
        if(!this._getList(isStatic)[model][name]) this._getList(isStatic)[model][name] = [];
        this._getList(isStatic)[model][name].push(handler);
    }
}

const instance = new DataModelManager();
Object.freeze(instance);

module.exports = instance;
