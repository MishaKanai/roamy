import { RootAction } from '../../store/action';
import produce from 'immer'

export interface RecentlyOpenedState {
    documents: {
        [name: string]: Date;
    }
    drawings: {
        [name: string]: Date;
    }
}


export const parsePath = (path: string) => {
    const isDoc = path.includes('/docs/');
    const isDrawing = path.includes('/drawings')
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

const recentlyOpenedReducer = (state: RecentlyOpenedState = createInitialState(), action: RootAction): RecentlyOpenedState => {
    switch (action.type) {
        case '@@router/LOCATION_CHANGE': {
            return mergeState(state, action.payload.location.pathname)
        }
        default:
            return state;
    }
}
export default recentlyOpenedReducer;