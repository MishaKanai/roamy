import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { updateDrawing } from "../Excalidraw/store/globalActions";
import uniq from 'lodash/uniq';
import { ExcalidrawImageElement } from "@excalidraw/excalidraw/types/element/types";

/**
 * 1. When pasting, create the file as an entry here.
 * 2. Then, when the SlateDocument change is dispatched, we add the 'link' to it in the document store.
 * 3. The element is passed the file ID, and uses that.
 */

type UploadedFile = {
    fileData: BinaryFileData;
    drawingBackrefs: string[];
    docBackrefs: string[];
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
        },
        addPastedFile(state, action: PayloadAction<{ fileData: BinaryFileData, doc: string }>) {
            state[action.payload.fileData.id] = {
                drawingBackrefs: [],
                docBackrefs: [action.payload.doc],
                fileData: action.payload.fileData
            }
        },
        deletePastedFile(state, action: PayloadAction<{ fileData: BinaryFileData, doc: string }>) {
            const existing = state[action.payload.fileData.id];
            if (existing?.docBackrefs?.length === 1 && !existing?.drawingBackrefs?.length && existing?.docBackrefs?.[0] === action.payload.doc) {
                delete state[action.payload.fileData.id];
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
                const existingDrawingBackRefs = state[id]?.drawingBackrefs ?? [];
                const existingDocBackrefs = state[id]?.docBackrefs ?? [];
                state[id] = {
                    fileData: binaryFile,
                    drawingBackrefs: uniq([...existingDrawingBackRefs, action.payload.drawingName]),
                    docBackrefs: existingDocBackrefs
                };
            })
        })
    }
})
export const { replaceFiles, addPastedFile, deletePastedFile } = uploadedFilesSlice.actions;

export default uploadedFilesSlice.reducer;