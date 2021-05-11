import React from 'react';
interface DrawingOptionsContext {
    renderDrawingOptions?(params: { drawingId: string }): JSX.Element
}
export const drawingOptionsContext = React.createContext<DrawingOptionsContext>({
    renderDrawingOptions: undefined
});

