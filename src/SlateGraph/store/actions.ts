import { createCustomAction } from 'typesafe-actions';
import { CREATE_DOC, UPDATE_DOC, DELETE_DOC, REPLACE_DOCS } from './constants'
import { SlateNode } from './domain';
import { SlateDocuments } from './reducer';

export const updateDocAction = createCustomAction(UPDATE_DOC, type => {
    return (docName: string, newDoc: SlateNode[], prevDoc: SlateNode[]) => {
        return {
            type,
            payload: {
                docName,
                newDoc,
                prevDoc,
            },
        }
    }
});

export const createDocAction = createCustomAction(CREATE_DOC, type => {
    return (docName: string, doc: SlateNode[], options?: {
        withBackref?: string;
    }) => {
        return {
            type,
            payload: {
                docName,
                doc,
                withBackref: options?.withBackref
            },
        }
    }
})

export const deleteDocAction = createCustomAction(DELETE_DOC, type => {
    return (docName: string) => {
        return {
            type,
            payload: {
                docName
            }
        }
    }
})

export const replaceDocsAction = createCustomAction(REPLACE_DOCS, type => {
    return (docs: SlateDocuments) => {
        return {
            type,
            payload: {
                docs
            }
        }
    }
})