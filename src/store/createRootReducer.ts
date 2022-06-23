import { combineReducers } from "redux";
import { connectRouter, RouterState } from "connected-react-router";
import slateDocumentsReducer, {
  SlateDocuments,
} from "../SlateGraph/store/reducer";
import { History } from "history";
import drawingsReducer, { DrawingDocuments } from "../Excalidraw/store/reducer";
import dbxReducer from '../dropbox/store/reducer';
import mergeReducer, { MergeState } from "../dropbox/resolveMerge/store/reducer";
import recentlyOpenedReducer, { RecentlyOpenedState } from "../RecentlyOpened/store/reducer";
import collectionsReducer, { CollectionsState } from "../dropbox/collections/reducer";

export type RootState = {
  router: RouterState<unknown>;
  documents: SlateDocuments;
  drawings: DrawingDocuments;
  dbx: ReturnType<typeof dbxReducer>;
  merge: MergeState;
  recentlyOpened: RecentlyOpenedState;
  collections: CollectionsState;
};
const createRootReducer = (history: History) =>
  combineReducers<RootState>({
    router: connectRouter(history),
    documents: slateDocumentsReducer,
    drawings: drawingsReducer,
    dbx: dbxReducer,
    merge: mergeReducer,
    recentlyOpened: recentlyOpenedReducer,
    collections: collectionsReducer
  });

export default createRootReducer;
