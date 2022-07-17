import { createReducer } from "@reduxjs/toolkit";
import { authSuccess } from "./globalActions";

export type AuthorizedAuthState = {
    state: 'authorized',
    accessToken: string,
    refreshToken: string,
}
export type DropboxAuthState = {
    state: 'not_authorized',
} | AuthorizedAuthState

const authReducer = createReducer(
    { state: 'not_authorized' } as DropboxAuthState,
    (builder) => {
        builder.addCase(authSuccess, (state, { payload: { accessToken, refreshToken }}) => ({
            state: 'authorized',
            accessToken,
            refreshToken,
        }))
    }
)
export default authReducer;