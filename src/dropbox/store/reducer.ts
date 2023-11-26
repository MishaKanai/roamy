import { combineReducers } from "redux";
import collectionReducer from "./activeCollectionSlice";
import dropboxAuthReducer from "./authSlice";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import storageSession from "redux-persist/lib/storage/session";

const authPersistConfig = {
  key: "auth",
  storage,
  whitelist: ["state"],
};
const collectionPersistConfig = {
  key: "collection",
  storage: storageSession,
  whitelist: ["rev", "revisions", "selectedFilePath", "state"],
};
const dbxReducer = combineReducers({
  auth: persistReducer(authPersistConfig, dropboxAuthReducer),
  collection: persistReducer(collectionPersistConfig, collectionReducer),
});
export default dbxReducer;
