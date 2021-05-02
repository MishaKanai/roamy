import { createCustomAction } from 'typesafe-actions';
import { CREATE_DRAWING, UPDATE_DRAWING, DELETE_DRAWING } from './constants'
import { DrawingData } from './domain';

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