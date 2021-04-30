import { createStore, applyMiddleware, compose } from 'redux'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage for web
import { routerMiddleware } from 'connected-react-router'
import createRootReducer from './createRootReducer';
import { createBrowserHistory } from 'history';
export const history = createBrowserHistory();
const persistConfig = {
  key: 'root',
  storage,
}

const persistedReducer = persistReducer(persistConfig, createRootReducer(history))

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