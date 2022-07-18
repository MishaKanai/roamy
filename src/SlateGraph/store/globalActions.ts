import { createAction } from "@reduxjs/toolkit";
import { Descendant } from "slate";

export const createDoc = createAction('documents/createDoc', (docName: string, doc: Descendant[], options?: {
    withBackref?: string;
}) => ({
    payload: {
        docName,
        doc,
        withBackref: options?.withBackref,
        createdDate: new Date()
    }
}))

export const updateDoc = createAction('documents/updateDoc', (docName: string, newDoc: Descendant[], prevDoc: Descendant[]) => ({
    payload: {
        docName,
        newDoc,
        prevDoc,
        updatedDate: new Date()
    },
}))

export const deleteDoc = createAction('documents/deleteDoc', (docName: string) => ({
    payload: { docName }
}))