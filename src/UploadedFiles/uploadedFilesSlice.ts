import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createSlice } from "@reduxjs/toolkit";
import { updateDrawing } from "../Excalidraw/store/globalActions";
import uniq from 'lodash/uniq';

type UploadedFile = {
    fileData: BinaryFileData;
    drawingBackrefs: string[];
}
type UploadedFiles = {
    [id: string]: UploadedFile;
}
const uploadedFilesSlice = createSlice({
    name: 'uploadedFiles',
    initialState: {} as UploadedFiles,
    reducers: {},
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

export default uploadedFilesSlice.reducer;