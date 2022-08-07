import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { updateDrawing } from "../Excalidraw/store/globalActions";
import uniq from 'lodash/uniq';
import { ExcalidrawImageElement } from "@excalidraw/excalidraw/types/element/types";

type UploadedFile = {
    fileData: BinaryFileData;
    drawingBackrefs: string[];
}
export type UploadedFiles = {
    [id: string]: UploadedFile;
}
const uploadedFilesSlice = createSlice({
    name: 'uploadedFiles',
    initialState: {} as UploadedFiles,
    reducers: {
        replaceFiles: {
            reducer(state, action: PayloadAction<{ files: UploadedFiles }>) {
                return action.payload.files;
            },
            prepare(files: UploadedFiles) {
                return {
                    payload: {
                        files
                    }
                }
            }
        }
    },
    extraReducers(builder) {
        builder
        .addCase(updateDrawing, (state, action) => {
            const nonDeletedImages = (action.payload.newDrawing.elements ?? []).filter(e => e.type === 'image' && !e.isDeleted).reduce((prev, curr) => {
                const fileId = (curr as ExcalidrawImageElement).fileId;
                if (fileId) {
                    prev[fileId] = true;
                }
                return prev;
            }, { } as { [fileId: string]: true })
            Object.entries(action.payload.newDrawing.files ?? {}).filter(([id]) => nonDeletedImages[id]).forEach(([id, binaryFile]) => {
                const existingBackRefs = state[id]?.drawingBackrefs ?? [];
                state[id] = {
                    fileData: binaryFile,
                    drawingBackrefs: uniq([...existingBackRefs, action.payload.drawingName])
                };
            })
        })
    }
})
export const { replaceFiles } = uploadedFilesSlice.actions;
export default uploadedFilesSlice.reducer;