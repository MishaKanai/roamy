import { combineReducers } from "redux";
import slateDocumentsReducer from "../SlateGraph/store/reducer";

const rootReducer = combineReducers({
    documents: slateDocumentsReducer
})
export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer