import { createAction } from "@reduxjs/toolkit";
import { DrawingData } from "./domain";

export const updateDrawing = createAction('drawing/update', (drawingName: string, newDrawing: Partial<DrawingData>) => ({
    payload: {
        drawingName,
        newDrawing,
        updatedDate: new Date()
    },
}));