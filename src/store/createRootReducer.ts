import { combineReducers } from "redux";
import { connectRouter, RouterState } from "connected-react-router";
import slateDocumentsReducer, {
  SlateDocuments,
} from "../SlateGraph/store/reducer";
import { History } from "history";

export type RootState = {
  router: RouterState<unknown>;
  documents: SlateDocuments;
};
const createRootReducer = (history: History) =>
  combineReducers<RootState>({
    router: connectRouter(history),
    documents: slateDocumentsReducer,
  });

export default createRootReducer;
