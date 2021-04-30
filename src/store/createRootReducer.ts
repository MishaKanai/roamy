import { combineReducers } from "redux";
import { connectRouter } from 'connected-react-router'
import slateDocumentsReducer from "../SlateGraph/store/reducer";
import {History}  from 'history'

const createRootReducer = (history: History) => combineReducers({
    router: connectRouter(history),
    documents: slateDocumentsReducer
  })
export type RootState = ReturnType<ReturnType<typeof createRootReducer>>;
export default createRootReducer;