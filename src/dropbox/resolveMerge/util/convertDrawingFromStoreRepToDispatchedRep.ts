import { BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types/types";
import { DrawingData, DrawingDataInStore } from "../../../Excalidraw/store/domain";

const convertDrawingInStoreToDispatchedDrawing = ({ filesIds, ...drawing }: DrawingDataInStore): DrawingData => {
    return {
        ...drawing,
        files: filesIds.reduce((prev, fileId) => {
            // just making the reducer accept this.
            // because we only have a drawingsReducer (and not a filesReducer) this is fine.
            prev[fileId] = {} as BinaryFileData;
            return prev;
        }, {} as BinaryFiles)
    }       
}

export default convertDrawingInStoreToDispatchedDrawing