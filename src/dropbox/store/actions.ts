import { createCustomAction } from 'typesafe-actions';
import { AUTH_SUCCESS, SELECT_FILEPATH } from './constants'

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