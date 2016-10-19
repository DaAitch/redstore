import 'reflect-metadata';
import { ActionReducer } from "@ngrx/store";
export declare const getReducer: (decoratedServiceClass: any) => ActionReducer<any>;
export declare function Redstore(): (undecoratedServiceClass: any) => any;
export declare function Action(): (undecoratedServiceClassPrototype: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function StateCopy(): (undecoratedServiceClass: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) => PropertyDescriptor;
