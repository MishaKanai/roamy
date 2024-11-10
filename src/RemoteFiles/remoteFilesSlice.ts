import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createDoc, updateDoc } from "../SlateGraph/store/globalActions";
import { getRemoteFilesFromNodes } from "../SlateGraph/store/util/getReferencesFromNodes";

export type RemoteFiles = {
    [fileId: string]: {
        count: number;
    }
}

const remoteFilesSlice = createSlice({
    name: 'remoteFiles',
    initialState: {} as RemoteFiles,
    reducers: {
        replaceRemoteFiles(state, action: PayloadAction<{ remoteFiles: RemoteFiles }>) {
            return action.payload.remoteFiles
        },
        addRemoteFile(state, action: PayloadAction<{
            fileId: string;
        }>) {
            const { fileId } = action.payload;
            const existing = state[fileId]?.count;
            if (typeof existing === 'number') {
                state[fileId].count = existing + 1;
            } else {
                state[fileId] = {
                    count: 1
                }
            }
        },
        removeRemoteFile(state,  action: PayloadAction<{
            fileId: string;
        }>) {
            const { fileId } = action.payload;
            const existing = state[fileId]?.count;
            if (typeof existing === 'number') {
                const newCount = existing - 1;
                if (newCount > 0) {
                    state[fileId].count = newCount;
                } else {
                    delete state[fileId];
                }
            } else {
                // unexpected, but ok.
            }
        }
    },
    extraReducers(builder) {
        builder
            // TODO: handle doc deletion?
            .addCase(createDoc, (state, { payload }) => {
                const filesForDoc = getRemoteFilesFromNodes(payload.doc);
                Object.entries(filesForDoc).forEach(([fileId, { count } ]) => {
                        if (!state[fileId]) {
                            state[fileId] = { count: 0 }
                        }
                        state[fileId].count += count;
                })
            })
            .addCase(updateDoc, (state, { payload: { newDoc, prevDoc } }) => {
                const oldRemoteFilesForDoc = getRemoteFilesFromNodes(prevDoc);
                const newRemoteFilesForDoc = getRemoteFilesFromNodes(newDoc);
                Object.entries(newRemoteFilesForDoc).forEach(([fileId, { count: newCount } ]) => {
                    if (!oldRemoteFilesForDoc[fileId]) {
                        if (!state[fileId]) {
                            state[fileId] = { count: 0 }
                        }
                        state[fileId].count += newCount;
                    }
                })
                Object.entries(oldRemoteFilesForDoc).forEach(([fileId, { count: oldCount }]) => {
                    const newCount = newRemoteFilesForDoc?.[fileId]?.count
                    const difference = oldCount - (newCount ?? 0);
                    // positive number means files were removed, and we decrease count
                    // negative number means files were added, and we increase count
                    if (!state[fileId]) {
                        state[fileId] = { count: 0 }
                    }
                    state[fileId].count -= difference
                })
            })
    }
})


export const { replaceRemoteFiles } = remoteFilesSlice.actions;

export default remoteFilesSlice.reducer;