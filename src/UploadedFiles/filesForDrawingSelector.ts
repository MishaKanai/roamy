import { BinaryFiles } from "@excalidraw/excalidraw/types/types";
import { createSelector } from "@reduxjs/toolkit";
import { DrawingDataInStore } from "../Excalidraw/store/domain";
import { UploadedFiles } from "./uploadedFilesSlice";

const createFilesForDrawingSelector = <T extends { drawings: {
    [drawingName: string]: {
        drawing: DrawingDataInStore
    }
}; files: { uploadedFiles: UploadedFiles } }>() => createSelector(
    (state: T, drawingName: string) => state.drawings[drawingName]?.drawing?.filesIds,
    (state: T) => state.files.uploadedFiles,
    (filesIds, uploadedFiles) => {
        return filesIds?.reduce((prev, currId) => {
            prev[currId] = uploadedFiles[currId].fileData;
            return prev;
        }, {} as BinaryFiles) ?? null
    }
)
export default createFilesForDrawingSelector;