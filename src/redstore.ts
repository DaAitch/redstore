import 'reflect-metadata';

import {Store as NgrxStore, Action as NgrxAction, ActionReducer} from "@ngrx/store";
import {flatarraycopy, flatcopy} from 'flatcopy';
import {nominate} from "nominate";

interface IPayloadReducer {
    (state: any, payload: any): any;
}

class Store {

    private _payloadReducer = <{[type: string]: IPayloadReducer}> {};

    put(actionType: string, payloadReducer: IPayloadReducer) {
        this._payloadReducer[actionType] = payloadReducer;
    }

    get(actionType: string) {
        return this._payloadReducer[actionType];
    }

    reducer = (state: any, action: NgrxAction) => {
        if(!action)
            return state;

        const payloadReducer = this.get(action.type);
        if(!payloadReducer)
            return state;

        const nextState = payloadReducer(state, action.payload);
        if(!nextState) {
            throw new Error('expecting at least empty object');
        }

        return nextState;
    }
}

// design-time params
const PARAMTYPES = 'design:paramtypes';

// metadata key for ngrx store in object
const NGRX_STORE = '$redstore$ngrxstore';

// metadata key for redstore store in class
const REDSTORE_STORE = '$redstore$store';

const getActionType = (reducerName: string, actionName: string) => `${reducerName}.${actionName}`;

export const getReducer = (decoratedServiceClass: any): ActionReducer<any> => {
    return getRedStore(decoratedServiceClass.prototype.constructor).reducer;
};

const getRedStore = (undecoratedServiceClass: any) => {
    return <Store>Reflect.getMetadata(REDSTORE_STORE, undecoratedServiceClass);
};

const setRedStore = (undecoratedServiceClass: any, redStore: Store) => {
    Reflect.defineMetadata(REDSTORE_STORE, redStore, undecoratedServiceClass);
};

const getOrCreateRedStore = (undecoratedServiceClass: any) => {
    let redStore = getRedStore(undecoratedServiceClass);
    if(!redStore) {
        redStore = new Store();
        setRedStore(undecoratedServiceClass, redStore);
    }

    return redStore;
};

const getStore = (thisArg: any) => {
    return <NgrxStore<any>>Reflect.getMetadata(NGRX_STORE, thisArg)
};

const setStore = (thisArg: any, store: NgrxStore<any>) => {
    Reflect.defineMetadata(NGRX_STORE, store, thisArg);
};

const getParamTypes = (undecoratedServiceClass: any) => {
    return <any[]>Reflect.getMetadata(PARAMTYPES, undecoratedServiceClass);
};

const setParamTypes = (undecoratedServiceClass: any, paramtypes: any[]) => {
    Reflect.defineMetadata(PARAMTYPES, paramtypes, undecoratedServiceClass);
};

export function Redstore() {
    return function(undecoratedServiceClass: any) {

        function factory(constructor: Function, args: any[]) {
            const c = function () {
                return constructor.apply(this, args);
            };

            c.prototype = constructor.prototype;
            return new (<any>c)();
        }

        const decoratedServiceClass = nominate(
            undecoratedServiceClass.name,
            function (...args: any[]) {
                const store = args.pop();
                const obj = factory(undecoratedServiceClass, args);

                setStore(obj, store);

                return obj;
            }
        );

        decoratedServiceClass.prototype = undecoratedServiceClass.prototype;
        
        // extend design-time paramtypes
        const paramTypes = getParamTypes(undecoratedServiceClass);
        const _paramTypes = flatarraycopy(paramTypes);
        _paramTypes.push(NgrxStore);
        setParamTypes(decoratedServiceClass, _paramTypes);

        return <typeof undecoratedServiceClass>decoratedServiceClass;
    };
}

export function Action() {

    return function(undecoratedServiceClassPrototype: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const undecoratedServiceClass = undecoratedServiceClassPrototype.constructor;
        const type = getActionType(undecoratedServiceClass.name, propertyKey);

        const actionFn = descriptor.value;
        descriptor.value = function(...args: any[]) {
            const payload = actionFn.apply(this, args);

            getStore(this).dispatch({
                type,
                payload
            });

            return payload;
        };

        const redStore = getOrCreateRedStore(undecoratedServiceClass);

        let reducer = <ActionReducer<any>>undecoratedServiceClass[propertyKey];

        // if no reducer defined and action is a `setter` function e.g. `setName`
        if(!reducer && /^set([^a-z].*)$/.test(propertyKey)) {

            let name = RegExp.$1;
            if(name.length > 0) {
                name = name.charAt(0).toLowerCase() + name.substring(1);
            }


            // default reducer
            reducer = (state: any, payload: any) => {
                const _state = flatcopy(state);
                _state[name] = payload;

                return _state;
            };
        }

        redStore.put(type, reducer);
        return descriptor;
    };
}

export function StateCopy() {

    return function(undecoratedServiceClass: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) {
        const actionType = getActionType(undecoratedServiceClass.name, propertyKey);
        const store = getOrCreateRedStore(undecoratedServiceClass);

        const reducer = store.get(actionType);

        if(reducer) {

            const copyReducer = (state:any, payload:any) => {
                const _state = flatcopy(state);
                const result = reducer(_state, payload);

                if(result) {
                    throw new Error('StateCopy decorated reducers should not return anything!');
                }

                return _state;
            };

            store.put(actionType, copyReducer);
        }

        return propertyDescriptor;
    };
}