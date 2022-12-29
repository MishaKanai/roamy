import { combineReducers } from "redux";
import { connectRouter } from "connected-react-router";
import slateDocumentsReducer from "../SlateGraph/store/slateDocumentsSlice";
import { History } from "history";
import drawingsReducer from "../Excalidraw/store/drawingsSlice";
import dbxReducer from '../dropbox/store/reducer';
import mergeReducer from "../dropbox/resolveMerge/store/reducer";
import recentlyOpenedReducer from "../RecentlyOpened/store/recentlyOpenedSlice";
import collectionsReducer from "../dropbox/collections/reducer";
import uploadedFilesReducer from '../UploadedFiles/uploadedFilesSlice';
import {
  persistReducer
} from 'redux-persist';
import localforage from 'localforage';

/**
 * Each session gets its own IDB key/value entry, to store files in.
 * When the session 'ends' (i.e. beforeunload) we delete the entry.
 */
const TAB_ID_KEY = 'tabId';
const getTabId = () => Date.now() + ':' + (Math.random() * 100000).toFixed(0);

const tabId = (() => {
  const storedTabId = sessionStorage.getItem(TAB_ID_KEY);
  if (storedTabId) {
    return storedTabId;
  }
  const newTabId = getTabId();
  sessionStorage.setItem(TAB_ID_KEY, newTabId);
  return newTabId;
})();

// by prepending 'persist:' we get the real key name in the IDB object store.
const getKVName = (key: string, prependPersist: boolean) =>  (prependPersist ? 'persist:' : '') + tabId + ':' + key

const handleUnload = () => {
  localforage.removeItem(getKVName('uploadedFiles', true))
};
window.addEventListener('beforeunload', handleUnload)


const createRootReducer = (history: History) =>
  combineReducers({
    router: connectRouter(history),
    documents: slateDocumentsReducer,
    drawings: drawingsReducer,
    dbx: dbxReducer,
    merge: mergeReducer,
    recentlyOpened: recentlyOpenedReducer,
    collections: collectionsReducer,
    files: persistReducer({
      key: getKVName('uploadedFiles', false),
      storage: localforage
    }, combineReducers({
      uploadedFiles: uploadedFilesReducer
    }))
  });

export default createRootReducer;
