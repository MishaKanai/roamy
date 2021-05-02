import { combineReducers } from "redux";
import { connectRouter, RouterState } from "connected-react-router";
import slateDocumentsReducer, {
  SlateDocuments,
} from "../SlateGraph/store/reducer";
import { History } from "history";
import drawingsReducer, { DrawingDocuments } from "../Excalidraw/store/reducer";

export type RootState = {
  router: RouterState<unknown>;
  documents: SlateDocuments;
  drawings: DrawingDocuments
};
const createRootReducer = (history: History) =>
  combineReducers<RootState>({
    router: connectRouter(history),
    documents: slateDocumentsReducer,
    drawings: drawingsReducer
  });

export default createRootReducer;
