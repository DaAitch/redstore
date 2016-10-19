import {Redstore, Action, StateCopy, getReducer} from "./redstore";
import {flatcopy} from "flatcopy";
import {Injectable} from "@angular/core";
import {createFixture, CurrentStateHolder} from "./helper.spec";
import {TestBed} from "@angular/core/testing";
import {StoreModule} from "@ngrx/store";

describe('redstore', () => {

    let state: () => any;

    afterEach(() => {
        state = undefined;
    });

    const createReducer = (serviceClass: any) => {

        const fixture = createFixture(serviceClass);

        const currentStateHolder = <CurrentStateHolder>fixture.get(CurrentStateHolder);
        state = () => currentStateHolder.getState();
        return fixture.get(serviceClass);
    };

    it('should create reducer with copy state reducer, "no-copy" state reducer and default reducer', () => {

        interface IState {
            name?: string;
            age?: number;
        }

        @Redstore()
        @Injectable()
        class R {

            @Action()
            setName(name: string) {
                return name;
            }

            @StateCopy()
            static setName(_state: IState, name: string) {
                _state.name = name;
            }

            @Action()
            setAge(age: number) {
                return age;
            }
            
            static setAge(state: IState, age: number) {
                const _state = flatcopy(state);
                _state.age = age;
                return _state;
            }

            @Action()
            setWeight(weight: number) {
                return weight; 
            }

        }

        const r = <R>createReducer(R);
        const state1 = state();

        r.setAge(5);
        const state2 = state();
        expect(state2).not.toBe(state1);
        expect(state2).toEqual(<IState>{
            age: 5
        });

        r.setName('Pete');
        const state3 = state();
        expect(state3).not.toBe(state2);
        expect(state3).toEqual(<IState>{
            age: 5,
            name: 'Pete'
        });

        r.setWeight(80);
        const state4 = state();
        expect(state4).not.toBe(state3);
        expect(state4).toEqual(<IState>{
            age: 5,
            name: 'Pete',
            weight: 80
        });
    });
    
    it('should not copy state by default', () => {

        // DON'T do this since it mutates state
        // it's only a test

        @Redstore()
        @Injectable()
        class R {

            @Action()
            setName(name: string) {
                return name;
            }

            static setName(state: any, name: string) {

                // eeeks bad boy
                state.name = name;
                return state;
            }

        }
        
        const r = <R>createReducer(R);

        const initialState = state();
        r.setName('Mary');

        const lastState = state();

        expect(initialState).toBe(lastState);
        expect(initialState.name).toBe('Mary');
    });

    it('should check `StateCopy` reducer not to return anything', () => {

        @Redstore()
        @Injectable()
        class R {

            @Action()
            doAnything() {}

            @StateCopy()
            static doAnything(_state: any) {
                return _state;
            }

        }

        const r = <R>createReducer(R);
        expect(() => r.doAnything()).toThrowError();
    });

    it('should check non-`StateCopy` reducer to return anything', () => {

        @Redstore()
        @Injectable()
        class R {

            @Action()
            doAnything() {}


            static doAnything(_state: any) {
            }

        }

        const r = <R>createReducer(R);
        expect(() => r.doAnything()).toThrowError();
    });

    it('should keep Redstore Injectable to be Injectable into other services/components/etc.', () => {
        @Redstore()
        @Injectable()
        class R {

            @Action()
            setName(name: string) {
                return name;
            }
        }

        @Injectable()
        class S {
            constructor(private r: R) {

            }

            setName() {
                this.r.setName('Pete');
            }
        }

        const storeModule = StoreModule.provideStore(getReducer(R), {});
        const testBed = TestBed.configureTestingModule({
            providers: [
                S, R, CurrentStateHolder
            ],
            imports: [
                storeModule
            ]
        });

        const s = <S>testBed.get(S);
        const stateHolder = <CurrentStateHolder>testBed.get(CurrentStateHolder);

        s.setName();

        expect(stateHolder.getState()).toEqual({
            name: 'Pete'
        });
    });

});