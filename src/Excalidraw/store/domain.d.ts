import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
export type DrawingData = {
    size: {
        height: number,
        width: number,
    },
    elements: ExcalidrawElement[]
}