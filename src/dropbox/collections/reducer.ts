import { files, DropboxResponseError } from "dropbox";
import { getType } from "typesafe-actions";
import { RootAction } from "../../store/action";
import { getCollections, getCollectionsFailure, getCollectionsSuccess } from "./actions";

export type CollectionsState = {
    _tag: 'initial'
} | {
    _tag: 'success',
    data: files.ListFolderResult["entries"] | null;
} | {
    _tag: 'pending',
    prevData: files.ListFolderResult["entries"] | null; 
} | {
    _tag: 'error',
    error: DropboxResponseError<any>;
}
const collectionsReducer = (state: CollectionsState = { _tag: 'initial' }, action: RootAction): CollectionsState => {
    switch (action.type) {
        case getType(getCollections):
            return {
                _tag: 'pending',
                prevData: state._tag === 'success' ? state.data : null
            }
        case getType(getCollectionsSuccess):
            return {
                _tag: 'success',
                data: action.payload.files
            }
        case getType(getCollectionsFailure):
            return {
                _tag: 'error',
                error: action.payload.error
            }
        default:
            return state;
    }
}

export default collectionsReducer;