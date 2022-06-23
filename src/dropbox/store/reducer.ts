import { DropboxResponseError } from "dropbox";
import { getType } from "typesafe-actions";
import { RootAction } from "../../store/action";
import { authSuccessAction, clearCurrentFileAction, selectFilePathAction, syncDebounceStartAction, syncFailureAction, syncStartAction, syncSuccessAction } from './actions';

type Success = {
    _type: 'success'
    date: Date
}
type SyncingState = {
    _type: 'initial'
} | Success | {
    _type: 'failure',
    date: Date
    error: DropboxResponseError<unknown>
} | {
    _type: 'request_pending',
} | {
    _type: 'debounced_pending',
}

export type AuthorizedAuthState = {
    state: 'authorized',
    accessToken: string
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
export type DropboxAuthState = {
    state: 'not_authorized',
} | AuthorizedAuthState
const dropboxAuthReducer = (state: DropboxAuthState = { state: 'not_authorized'}, action: RootAction): DropboxAuthState => {
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
                accessToken: action.payload.accessToken,
                selectedFilePath: '',
                syncing: { _type: 'initial' }
            }
        }
        case getType(selectFilePathAction): {
            if (state.state === 'authorized') {
                return {
                    ...state,
                    selectedFilePath: action.payload.path,
                    rev: action.payload.rev,
                    revisions: action.payload.revisions,
                    syncing: { _type: 'success', date: new Date() }
                }
            }
            // can log error here
            return state;
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
export default dropboxAuthReducer;