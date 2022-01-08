import { createCustomAction } from 'typesafe-actions';
import { files, DropboxResponseError } from 'dropbox'
import { GET_COLLECTIONS, GET_COLLECTIONS_FAILURE, GET_COLLECTIONS_SUCCESS } from './constants'

export const getCollections = createCustomAction(GET_COLLECTIONS, type => {
    return () => {
        return {
            type,
        }
    }
});

export const getCollectionsSuccess = createCustomAction(GET_COLLECTIONS_SUCCESS, type => {
    return (files: files.ListFolderResult["entries"] ) => {
        return {
            type,
            payload: {
                files
            }
        }
    }
});

export const getCollectionsFailure = createCustomAction(GET_COLLECTIONS_FAILURE, type => {
    return (error: DropboxResponseError<any>) => {
        return {
            type,
            payload: {
                error
            }
        }
    }
});