import { createCustomAction } from 'typesafe-actions';
import { CREATE_DOC, UPDATE_DOC, DELETE_DOC } from './constants'
import { SlateNode } from './domain';

export const updateDocAction = createCustomAction(UPDATE_DOC, type => {
    return (docName: string, newDoc: SlateNode[],) => {
        return {
            type,
            payload: {
                docName,
                newDoc,
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