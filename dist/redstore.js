"use strict";
require('reflect-metadata');
var store_1 = require("@ngrx/store");
var flatcopy_1 = require('flatcopy');
var nominate_1 = require("nominate");
var Store = (function () {
    function Store() {
        var _this = this;
        this._payloadReducer = {};
        this.reducer = function (state, action) {
            if (!action)
                return state;
            var payloadReducer = _this.get(action.type);
            if (!payloadReducer)
                return state;
            var nextState = payloadReducer(state, action.payload);
            if (!nextState) {
                throw new Error('expecting at least empty object');
            }
            return nextState;
        };
    }
    Store.prototype.put = function (actionType, payloadReducer) {
        this._payloadReducer[actionType] = payloadReducer;
    };
    Store.prototype.get = function (actionType) {
        return this._payloadReducer[actionType];
    };
    return Store;
}());
// design-time params
var PARAMTYPES = 'design:paramtypes';
// metadata key for ngrx store in object
var NGRX_STORE = '$redstore$ngrxstore';
// metadata key for redstore store in class
var REDSTORE_STORE = '$redstore$store';
var getActionType = function (reducerName, actionName) { return (reducerName + "." + actionName); };
exports.getReducer = function (decoratedServiceClass) {
    return getRedStore(decoratedServiceClass.prototype.constructor).reducer;
};
var getRedStore = function (undecoratedServiceClass) {
    return Reflect.getMetadata(REDSTORE_STORE, undecoratedServiceClass);
};
var setRedStore = function (undecoratedServiceClass, redStore) {
    Reflect.defineMetadata(REDSTORE_STORE, redStore, undecoratedServiceClass);
};
var getOrCreateRedStore = function (undecoratedServiceClass) {
    var redStore = getRedStore(undecoratedServiceClass);
    if (!redStore) {
        redStore = new Store();
        setRedStore(undecoratedServiceClass, redStore);
    }
    return redStore;
};
var getStore = function (thisArg) {
    return Reflect.getMetadata(NGRX_STORE, thisArg);
};
var setStore = function (thisArg, store) {
    Reflect.defineMetadata(NGRX_STORE, store, thisArg);
};
var getParamTypes = function (undecoratedServiceClass) {
    return Reflect.getMetadata(PARAMTYPES, undecoratedServiceClass);
};
var setParamTypes = function (undecoratedServiceClass, paramtypes) {
    Reflect.defineMetadata(PARAMTYPES, paramtypes, undecoratedServiceClass);
};
function Redstore() {
    return function (undecoratedServiceClass) {
        function factory(constructor, args) {
            var c = function () {
                return constructor.apply(this, args);
            };
            c.prototype = constructor.prototype;
            return new c();
        }
        var decoratedServiceClass = nominate_1.nominate(undecoratedServiceClass.name, function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var store = args.pop();
            var obj = factory(undecoratedServiceClass, args);
            setStore(obj, store);
            return obj;
        });
        decoratedServiceClass.prototype = undecoratedServiceClass.prototype;
        // extend design-time paramtypes
        var paramTypes = getParamTypes(undecoratedServiceClass);
        var _paramTypes = flatcopy_1.flatarraycopy(paramTypes);
        _paramTypes.push(store_1.Store);
        setParamTypes(decoratedServiceClass, _paramTypes);
        return decoratedServiceClass;
    };
}
exports.Redstore = Redstore;
function Action() {
    return function (undecoratedServiceClassPrototype, propertyKey, descriptor) {
        var undecoratedServiceClass = undecoratedServiceClassPrototype.constructor;
        var type = getActionType(undecoratedServiceClass.name, propertyKey);
        var actionFn = descriptor.value;
        descriptor.value = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            var payload = actionFn.apply(this, args);
            getStore(this).dispatch({
                type: type,
                payload: payload
            });
            return payload;
        };
        var redStore = getOrCreateRedStore(undecoratedServiceClass);
        var reducer = undecoratedServiceClass[propertyKey];
        // if no reducer defined and action is a `setter` function e.g. `setName`
        if (!reducer && /^set([^a-z].*)$/.test(propertyKey)) {
            var name_1 = RegExp.$1;
            if (name_1.length > 0) {
                name_1 = name_1.charAt(0).toLowerCase() + name_1.substring(1);
            }
            // default reducer
            reducer = function (state, payload) {
                var _state = flatcopy_1.flatcopy(state);
                _state[name_1] = payload;
                return _state;
            };
        }
        redStore.put(type, reducer);
        return descriptor;
    };
}
exports.Action = Action;
function StateCopy() {
    return function (undecoratedServiceClass, propertyKey, propertyDescriptor) {
        var actionType = getActionType(undecoratedServiceClass.name, propertyKey);
        var store = getOrCreateRedStore(undecoratedServiceClass);
        var reducer = store.get(actionType);
        if (reducer) {
            var copyReducer = function (state, payload) {
                var _state = flatcopy_1.flatcopy(state);
                var result = reducer(_state, payload);
                if (result) {
                    throw new Error('StateCopy decorated reducers should not return anything!');
                }
                return _state;
            };
            store.put(actionType, copyReducer);
        }
        return propertyDescriptor;
    };
}
exports.StateCopy = StateCopy;
//# sourceMappingURL=redstore.js.map