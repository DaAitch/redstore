import {StoreModule, Store} from "@ngrx/store";
import {getReducer} from "./redstore";
import {TestBed} from "@angular/core/testing";
import {Injectable} from "@angular/core";

@Injectable()
export class CurrentStateHolder {
    private state: any;
    
    constructor(store: Store<any>) {
        store.subscribe((state: any) => this.state = state);
    }
    
    getState() {
        return this.state;
    }
}

export const createFixture = (serviceClass: any) => {

    const storeModule = StoreModule.provideStore(getReducer(serviceClass), {});
    return TestBed.configureTestingModule({
        providers: [
            serviceClass,
            CurrentStateHolder
        ],
        imports: [
            storeModule
        ]
    });
};