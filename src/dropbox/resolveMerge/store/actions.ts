import { createCustomAction } from 'typesafe-actions';
import { ATTEMPT_RESOLVE_MERGE, MERGE_SUCCESS, MERGE_TRIGGERED } from './constants';
import { SlateDocuments } from '../../../SlateGraph/store/slateDocumentsSlice';
import { DrawingDocuments } from '../../../Excalidraw/store/reducer';

export const mergeTriggeredAction = createCustomAction(MERGE_TRIGGERED, type => {
    return ({ documents, drawings }: {
        documents: SlateDocuments,
        drawings: DrawingDocuments
    }) => {
        return {
            type,
            payload: {
                documents,
                drawings
            },
        }
    }
});

export const attemptResolveMergeAction = createCustomAction(ATTEMPT_RESOLVE_MERGE, type => {
    return ({ documents, drawings }: {
        documents: SlateDocuments,
        drawings: DrawingDocuments
    }) => {
        return {
            type,
            payload: {
                documents,
                drawings
            },
        }
    }
});

export const mergeSuccessAction = createCustomAction(MERGE_SUCCESS, type => {
    return (rev: string) => {
        return {
            type,
            payload: {
            },
        }
    }
});