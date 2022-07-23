import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { updateDrawing } from "../Excalidraw/store/globalActions";
import uniq from 'lodash/uniq';

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
            Object.entries(action.payload.newDrawing.files ?? {}).forEach(([id, binaryFile]) => {
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