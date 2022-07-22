import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import { BinaryFiles } from '@excalidraw/excalidraw/types/types'

export type DrawingData = {
    size: {
        height: number,
        width: number,
    },
    elements: ExcalidrawElement[]
    files?: BinaryFiles;
}

export type DrawingDataInStore = {
    size: {
        height: number,
        width: number,
    },
    elements: ExcalidrawElement[];
    filesIds: string[];
}