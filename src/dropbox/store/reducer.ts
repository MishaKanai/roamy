import { getType } from "typesafe-actions";
import { RootAction } from "../../store/action";
import { authSuccessAction, selectFilePathAction } from './actions';

export type DropboxAuthState = {
    state: 'not_authorized',
} | {
    state: 'authorized',
    accessToken: string
    selectedFilePath: string,
    rev?: string,
}
const dropboxAuthReducer = (state: DropboxAuthState = { state: 'not_authorized'}, action: RootAction): DropboxAuthState => {
    switch (action.type) {
        case getType(authSuccessAction): {
            return {
                state: 'authorized',
                accessToken: action.payload.accessToken,
                selectedFilePath: '',
            }
        }
        case getType(selectFilePathAction): {
            if (state.state === 'authorized') {
                return {
                    ...state,
                    selectedFilePath: action.payload.path,
                    rev: action.payload.rev
                }
            }
            // can log error here
            return state;
        }
    }
    return state;
}
export default dropboxAuthReducer;