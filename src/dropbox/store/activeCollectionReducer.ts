import { getType } from "typesafe-actions";
import { RootAction } from "../../store/action";
import { authSuccessAction, clearCurrentFileAction, selectFilePathAction, syncDebounceStartAction, syncFailureAction, syncStartAction, syncSuccessAction } from './actions';
import { SyncingState } from "./domain";

export type AuthorizedCollectionState = {
    state: 'authorized',
    selectedFilePath: string,
    rev?: string,
    syncing?: SyncingState
    revisions?: {
        documents: {
            [docName: string]: string;
        }
        drawings: {
            [docName: string]: string;
        }
    }
}
export type CollectionState = {
    state: 'not_authorized',
} | AuthorizedCollectionState
const collectionReducer = (state: CollectionState = { state: 'not_authorized'}, action: RootAction): CollectionState => {
    switch (action.type) {
        case getType(clearCurrentFileAction): {
            if (state.state !== 'authorized') {
                return state;
            }
            return {
                ...state,
                selectedFilePath: '',
                syncing: { _type: 'initial' }
            }
        }
        case getType(authSuccessAction): {
            return {
                state: 'authorized',
                selectedFilePath: '',
                syncing: { _type: 'initial' }
            }
        }
        case getType(selectFilePathAction): {
            return {
                state: 'authorized',
                selectedFilePath: action.payload.path,
                rev: action.payload.rev,
                revisions: action.payload.revisions,
                syncing: { _type: 'success', date: new Date() }
            }
        }

        case getType(syncDebounceStartAction): {
            if (state.state === 'authorized') {
                return {
                    ...state,
                    syncing: { _type: 'debounced_pending' }
                }
            }
            return state;
        }
        case getType(syncStartAction): {
            if (state.state === 'authorized') {
                return {
                    ...state,
                    syncing: { _type: 'request_pending' }
                }
            }
            return state;
        }
        case getType(syncSuccessAction): {
            if (state.state === 'authorized') {
                return {
                    ...state,
                    rev: action.payload.rev,
                    revisions: action.payload.revisions,
                    syncing: { _type: 'success', date: action.payload.date }
                }
            }
            return state;
        }
        case getType(syncFailureAction): {
            if (state.state === 'authorized') {
                return {
                    ...state,
                    syncing: { _type: 'failure', date: action.payload.date, error: action.error }
                }
            }
            return state;
        }
    }
    return state;
}
export default collectionReducer;