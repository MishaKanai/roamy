import { combineReducers } from "redux";
import { connectRouter } from "connected-react-router";
import slateDocumentsReducer from "../SlateGraph/store/slateDocumentsSlice";
import { History } from "history";
import drawingsReducer from "../Excalidraw/store/drawingsSlice";
import dbxReducer from "../dropbox/store/reducer";
import mergeReducer from "../dropbox/resolveMerge/store/reducer";
import recentlyOpenedReducer from "../RecentlyOpened/store/recentlyOpenedSlice";
import collectionsReducer from "../dropbox/collections/reducer";
import uploadedFilesReducer from "../UploadedFiles/uploadedFilesSlice";
import remoteFilesReducer from "../RemoteFiles/remoteFilesSlice";
import { persistReducer } from "redux-persist";
import localforage from "localforage";
import storageSession from "redux-persist/lib/storage/session";
import categoriesReducer from "../Category/store/categoriesSlice";

/**
 * Each session gets its own IDB key/value entry, to store files in.
 * Let's just delete everything on logout.
 */

const tabId = !localStorage.getItem("persist:auth") // if not logged in, don't create a special entry.
  ? undefined
  : (() => {
      const getTabId = () =>
        Date.now() + ":" + (Math.random() * 100000).toFixed(0);
      const TAB_ID_KEY = "tabId";
      const storedTabId = sessionStorage.getItem(TAB_ID_KEY);
      if (storedTabId) {
        return storedTabId;
      }
      const newTabId = getTabId();
      sessionStorage.setItem(TAB_ID_KEY, newTabId);
      return newTabId;
    })();

const lf = tabId
  ? localforage.createInstance({
      name: tabId,
    })
  : localforage;

/**
 * Build a list of tabIds to delete when we log out.
 */
if (tabId) {
  localforage.getItem("tabs", (err, val) => {
    let tabList = { [tabId]: true };
    if (val && typeof val === "object") {
      tabList = { ...val, ...tabList };
    }
    localforage.setItem("tabs", tabList);
  });
}
const createRootReducer = (history: History) =>
  combineReducers({
    router: connectRouter(history),
    documents: slateDocumentsReducer,
    categories: categoriesReducer,
    drawings: drawingsReducer,
    dbx: dbxReducer,
    merge: mergeReducer,
    recentlyOpened: recentlyOpenedReducer,
    collections: collectionsReducer,
    files: persistReducer(
      {
        key: "files",
        storage: storageSession,
        blacklist: ["uploadedFiles"],
      },
      combineReducers({
        uploadedFiles: persistReducer(
          {
            key: "uploadedFiles",
            storage: lf,
          },
          uploadedFilesReducer
        ),
        remoteFiles: remoteFilesReducer,
      })
    ),
  });

export default createRootReducer;
