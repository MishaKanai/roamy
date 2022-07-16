import { createCustomAction } from 'typesafe-actions';
import { DropboxResponseError } from 'dropbox'
import { AUTH_SUCCESS, SELECT_FILEPATH, SYNC_START, SYNC_SUCCESS, SYNC_FAILURE, SYNC_DEBOUNCE_START, CLEAR_FILEPATH } from './constants'
import { AuthorizedCollectionState } from './activeCollectionReducer';

export const authSuccessAction = createCustomAction(AUTH_SUCCESS, type => {
    return (accessToken: string, refreshToken: string) => {
        return {
            type,
            payload: {
                accessToken, refreshToken
            },
        }
    }
});

export const clearCurrentFileAction = createCustomAction(CLEAR_FILEPATH, type => {
    return () => {
        return {
            type,
        }
    }
});


export const selectFilePathAction = createCustomAction(SELECT_FILEPATH, type => {
    return (path: string, rev: string, revisions: AuthorizedCollectionState['revisions']) => {
        return {
            type,
            payload: {
                path,
                rev,
                revisions
            }
        }
    }
})


export const syncDebounceStartAction = createCustomAction(SYNC_DEBOUNCE_START, type => {
    return () => {
        return {
            type,
        }
    }
})


export const syncStartAction = createCustomAction(SYNC_START, type => {
    return () => {
        return {
            type,
        }
    }
})

export const syncSuccessAction = createCustomAction(SYNC_SUCCESS, type => {
    return (rev: string, revisions: AuthorizedCollectionState['revisions']) => {
        return {
            type,
            payload: {
                rev,
                date: new Date(),
                revisions
            }
        }
    }
})

export const syncFailureAction = createCustomAction(SYNC_FAILURE, type => {
    return (error: DropboxResponseError<unknown>) => {
        return {
            type,
            payload: {
                date: new Date()
            },
            error,
        }
    }
})