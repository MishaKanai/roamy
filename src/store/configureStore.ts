import { createStore } from 'redux'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage for web

import rootReducer from './rootReducer';

const persistConfig = {
  key: 'root',
  storage,
}

const persistedReducer = persistReducer(persistConfig, rootReducer)

const {
    __REDUX_DEVTOOLS_EXTENSION__: installDevTools = () => (f: any) => f,
  } = window as any;

const configureStore = () => {
  let store = createStore(persistedReducer, installDevTools())
  let persistor = persistStore(store as any)
  return { store, persistor }
}
export default configureStore;