import { createCustomAction } from 'typesafe-actions';
import { CREATE_DRAWING, UPDATE_DRAWING, DELETE_DRAWING, REPLACE_DRAWINGS } from './constants'
import { DrawingData } from './domain';
import { DrawingDocuments } from './reducer';

export const updateDrawingAction = createCustomAction(UPDATE_DRAWING, type => {
    return (drawingName: string, newDrawing: Partial<DrawingData>) => {
        return {
            type,
            payload: {
                drawingName,
                newDrawing,
            },
        }
    }
});

export const createDrawingAction = createCustomAction(CREATE_DRAWING, type => {
    return (drawingName: string, drawing: DrawingData, options?: {
        withBackref?: string;
    }) => {
        return {
            type,
            payload: {
                drawingName,
                drawing,
                withBackref: options?.withBackref
            },
        }
    }
})

export const deleteDrawingAction = createCustomAction(DELETE_DRAWING, type => {
    return (drawingName: string) => {
        return {
            type,
            payload: {
                drawingName
            }
        }
    }
})


export const replaceDrawingsAction = createCustomAction(REPLACE_DRAWINGS, type => {
    return (drawings: DrawingDocuments) => {
        return {
            type,
            payload: {
                drawings
            }
        }
    }
})