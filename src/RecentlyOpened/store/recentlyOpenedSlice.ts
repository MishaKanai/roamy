import { createReducer, AnyAction, PayloadAction } from "@reduxjs/toolkit";
import produce from 'immer'
import { selectFilePath } from "../../dropbox/store/globalActions";
import { RouterLocation } from "connected-react-router";

export interface RecentlyOpenedState {
    documents: {
        [name: string]: Date;
    }
    drawings: {
        [name: string]: Date;
    }
}


export const parsePath = (path: string) => {
    const isDoc = path.startsWith('/docs/');
    const isDrawing = path.startsWith('/drawings/')
    if (isDoc || isDrawing) {
        const name = path.slice(path.lastIndexOf('/') + 1);
        return {
            type: isDoc ? 'document' : 'drawing',
            name
        }
    }
    return null
}
const mergeState = (state: RecentlyOpenedState, path: string): RecentlyOpenedState => {
    const parsed = parsePath(path);
    if (parsed) {
        const { type, name } = parsed;
        return produce(state, draftState => {
            draftState[type === 'drawing' ? 'drawings' : 'documents'][name] = new Date();
        });
    }
    return state
}

const createInitialState = (): RecentlyOpenedState => {
    const path = window.location.pathname;
    const initialState = {
        drawings: {},
        documents: {}
    }
    return mergeState(initialState, path);
}

function isPushAction(
    action: AnyAction
  ): action is PayloadAction<{ location: RouterLocation<unknown> }> {
    return action.type === '@@router/LOCATION_CHANGE';
  }

const authReducer = createReducer(
    createInitialState(),
    (builder) => {
        builder
        .addCase(selectFilePath, () => ({
            drawings: {},
            documents: {}
        }))
        .addMatcher(isPushAction, (state, action) => {
            return mergeState(state, action.payload.location.pathname);
        })
        /**
         * TODO
         */
        /*
        case getType(deleteDocAction): {
            return {
                ...state,
                documents: Object.fromEntries(Object.entries(state.documents).filter(([name]) => name !== action.payload.docName))
            }
        }
        case getType(deleteDrawingAction): {
            return {
                ...state,
                drawings: Object.fromEntries(Object.entries(state.drawings).filter(([name]) => name !== action.payload.drawingName))
            }
        }
        */
    }
)
export default authReducer;