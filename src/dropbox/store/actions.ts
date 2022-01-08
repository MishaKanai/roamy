import { createCustomAction } from 'typesafe-actions';
import { DropboxResponseError } from 'dropbox'
import { AUTH_SUCCESS, SELECT_FILEPATH, SYNC_START, SYNC_SUCCESS, SYNC_FAILURE, SYNC_DEBOUNCE_START, CLEAR_FILEPATH } from './constants'

export const authSuccessAction = createCustomAction(AUTH_SUCCESS, type => {
    return (accessToken: string) => {
        return {
            type,
            payload: {
                accessToken
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
    return (path: string, rev: string) => {
        return {
            type,
            payload: {
                path,
                rev
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
    return (rev: string) => {
        return {
            type,
            payload: {
                rev,
                date: new Date()
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