import { getType } from "typesafe-actions";
import { RootAction } from "../../store/action";
import { authSuccessAction } from './actions';

export type AuthorizedAuthState = {
    state: 'authorized',
    accessToken: string,
    refreshToken: string,
}
export type DropboxAuthState = {
    state: 'not_authorized',
} | AuthorizedAuthState
const dropboxAuthReducer = (state: DropboxAuthState = { state: 'not_authorized'}, action: RootAction): DropboxAuthState => {
    switch (action.type) {
        case getType(authSuccessAction): {
            return {
                state: 'authorized',
                accessToken: action.payload.accessToken,
                refreshToken: action.payload.refreshToken,
            }
        }
    }
    return state;
}
export default dropboxAuthReducer;