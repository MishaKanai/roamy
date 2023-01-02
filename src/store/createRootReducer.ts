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
import remoteFilesReducer from '../RemoteFiles/remoteFilesSlice'
import {
  persistReducer
} from 'redux-persist';
import storageSession from "redux-persist/lib/storage/session";

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
      key: 'uploadedFiles',
      storage: storageSession
    }, combineReducers({
      uploadedFiles: uploadedFilesReducer,
      remoteFiles: remoteFilesReducer
    }))
  });

export default createRootReducer;
