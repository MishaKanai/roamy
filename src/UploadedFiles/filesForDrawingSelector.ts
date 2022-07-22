import { BinaryFiles } from "@excalidraw/excalidraw/types/types";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store/configureStore";

const createFilesForDrawingSelector = () => createSelector(
    (state: RootState, drawingName: string) => state.drawings[drawingName]?.drawing?.filesIds,
    (state: RootState) => state.uploadedFiles,
    (filesIds, uploadedFiles) => {
        return filesIds?.reduce((prev, currId) => {
            prev[currId] = uploadedFiles[currId].fileData;
            return prev;
        }, {} as BinaryFiles) ?? null
    }
)
export default createFilesForDrawingSelector;