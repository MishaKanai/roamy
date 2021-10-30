import { combineReducers } from "redux";
import { connectRouter, RouterState } from "connected-react-router";
import slateDocumentsReducer, {
  SlateDocuments,
} from "../SlateGraph/store/reducer";
import { History } from "history";
import drawingsReducer, { DrawingDocuments } from "../Excalidraw/store/reducer";
import authReducer, { DropboxAuthState } from '../dropbox/store/reducer';
import storage from "redux-persist/lib/storage";
import { persistReducer } from 'redux-persist'
import mergeReducer, { MergeState } from "../dropbox/resolveMerge/store/reducer";

const authPersistConfig = {
  key: 'auth',
  storage: storage,
  whitelist: ['state', 'accessToken', 'rev', 'selectedFilePath']
}
export type RootState = {
  router: RouterState<unknown>;
  documents: SlateDocuments;
  drawings: DrawingDocuments;
  auth: DropboxAuthState;
  merge: MergeState;
};
const createRootReducer = (history: History) =>
  combineReducers<RootState>({
    router: connectRouter(history),
    documents: slateDocumentsReducer,
    drawings: drawingsReducer,
    auth: persistReducer(authPersistConfig, authReducer) as typeof authReducer,
    merge: mergeReducer
  });

export default createRootReducer;
