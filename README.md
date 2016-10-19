# redstore (experimental)
Syntactic sugar for `ngrx/store` reducer.

`redstore` (*REDucerSTORE*) will helps you writing your action-creators and reducers compact
in just a few lines, integrated in `Angular2`'s dependency injection system.

## Example (*TodoList*)
It only takes 4 little steps:

1. **create your state structure**. We want a *TodoList*
where we can add and remove todos and give a name for the list.
    ```typescript
    export interface IState {
        name?: string;
        todos?: string[];
    }
    ```
2. **create your `Redstore`** which is action-creator and reducer in one class.
    ```typescript
    @Redstore()
    @Injectable()
    export class TodoListRedstore {

        @Action()
        addTodo(item: string) {
            return item;
        }

        @StateCopy()
        static addTodo(_state: IState, item: string) {
            const _todos = _state.todos = flatarraycopy(_state.todos);
            _todos.push(item);
        }

        @Action()
        removeTodo(index: number) {
            return index;
        }

        @StateCopy()
        static removeTodo(_state: IState, index: number) {
            const _todos = _state.todos = flatarraycopy(_state.todos);
            _todos.splice(index, 1);
        }

        // shortcut `set...` for a reducer copying state and setting `name`
        @Action()
        setName(name: string) {
            return name;
        }

        // can be skipped as this is the default reducer for `set...`-Actions
        // @StateCopy()
        // static setName(_state: IState, name: string) {
        //     _state.name = name
        // }
    }
    ```

3. **provide `ngrx/store` module** to your application ([also see here](https://github.com/ngrx/store#setup))
    ```typescript
    const storeModule = StoreModule.provideStore(
        getReducer(TodoListRedstore),
        {}
    );

    @NgModule({
      imports: [
        // ...
        storeModule
      ]
    })
    export class AppModule {}
    ```
4. **inject your `Redstore`-class** (e.g. `TodoListRedstore`) where
you want and use its methods to dispatch actions.
    ```typescript
    @Component({
        selector: 'myTodo',
        template: require('./todo.component.html')
    })
    export class TodoComponent {

        todos$: Observable<string[]>;

        constructor(
            private todoListRedstore: TodoListRedstore,
            private store: Store<IState>
        ) {
            this.todos$ = store.map((state: IState) => state.todos);
        }

        addTodo(item: string) {
            // automagically dispatches addTodo-action
            this.todoListRedstore.addTodo(item);
        }

        removeTodo(index: number) {
            // automagically dispatches removeTodo-action
            this.todoListRedstore.removeTodo(index);
        }

        setName(name: string) {
            // automagically dispatches setName-action
            this.todoListRedstore.setName(name);
        }
    }
    ```

## Ideas
1. no boilerplate code
    1. **no action-types** have to be defined by the developer.

        Type is per convention `<className>.<methodName>`.

    1. **no action-creators**, but only payloads.

        `@Action()` decorated methods only returns the payload.

    1. **no dispatch calls**.

        `@Action()` decorated methods magically dispatch the
        corresponding action.

    1. **no state copy and return code**, but `@StateCopy` decorator.

        `@StateCopy` decorated reducer getting a `flatcopy` of state
        as first parameter and shall not return it.

1. straight reducers
    1. **no switch blocks**, but invocation of reducers per convention.
    1. **directly testable**, because just static methods.
    1. **optional default reducers**, with name `setX` for
    `@Action` decorated methods per default adds a reducer setting `x`
    (lower camel-case for `X`) to the payload.