import { createAction } from "@reduxjs/toolkit";
import { Revisions } from "./activeCollectionSlice";

export const authSuccess = createAction('dropbox/authSuccess', (accessToken: string, refreshToken: string) => {
    return {
        payload: {
            accessToken, refreshToken
        },
    }
});

export const selectFilePath = createAction('dropbox/selectFilePath', (path: string, rev: string, revisions: Revisions) => ({
    payload: {
        path, rev, revisions, date: new Date()
    }
}));