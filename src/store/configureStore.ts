import { createStore, applyMiddleware, compose, Reducer } from 'redux'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage for web
import { routerMiddleware } from 'connected-react-router'
import createRootReducer, { RootState } from './createRootReducer';
import { createBrowserHistory } from 'history';
import { PersistPartial } from 'redux-persist/es/persistReducer';
import { RootAction } from './action';
export const history = createBrowserHistory();

const persistConfig = {
  key: 'root',
  storage,
}

// had to make this type explicit for the export as lib:
/*
 Exported variable 'configureStore' has or is using name '$CombinedState' from external module
 "/node_modules/redux/index" but cannot be named
*/
const persistedReducer: Reducer<RootState & PersistPartial, RootAction> = persistReducer(persistConfig, createRootReducer(history))

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const configureStore = () => {
  let store = createStore(persistedReducer, 
    compose(
      composeEnhancers(applyMiddleware(
        routerMiddleware(history),
      ))
  ))
  let persistor = persistStore(store as any)
  return { store, persistor }
}
export default configureStore;