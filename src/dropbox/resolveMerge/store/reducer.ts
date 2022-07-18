import { getType } from "typesafe-actions";
import { DrawingDocuments } from "../../../Excalidraw/store/reducer";
import { SlateDocuments } from "../../../SlateGraph/store/slateDocumentsSlice";
import { RootAction } from "../../../store/action";
import { syncSuccess } from "../../store/activeCollectionSlice";
import { attemptResolveMergeAction, mergeSuccessAction, mergeTriggeredAction } from "./actions";

export type MergeState = {
    state: 'resolved'
} | {
    state: 'attempting_resolution'
    attempted: {
        documents: SlateDocuments,
        drawings: DrawingDocuments
    }
} | {
    state: 'conflict',
    key: number,
    attempted: {
        documents: SlateDocuments,
        drawings: DrawingDocuments
    }
}
const resolved = { state: 'resolved' } as const
const mergeReducer = (state: MergeState = resolved, action: RootAction): MergeState => {
    switch (action.type) {
        case getType(mergeTriggeredAction): {
            const { documents, drawings } = action.payload;
            return {
                key: state.state === 'conflict' ? state.key + 1 : 1,
                state: 'conflict',
                attempted: {
                    documents,
                    drawings
                }
            }
        }
        case getType(attemptResolveMergeAction): {
            const { documents, drawings } = action.payload;
            return {
                state: 'attempting_resolution',
                attempted: {
                    documents,
                    drawings
                }
            }
        }
        case syncSuccess('foo', { documents: {}, drawings: {}}).type:
        case getType(mergeSuccessAction): {
            return {
                state: 'resolved'
            }
        }
        
        default: 
            return state;
    }
}
export default mergeReducer;