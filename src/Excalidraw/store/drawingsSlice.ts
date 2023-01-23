import { DrawingData, DrawingDataInStore } from './domain'
import hashSum from 'hash-sum';
import getDrawingsFromNodes from './util/getDrawingReferencesFromDocNodes';
import { createDoc, deleteDoc, updateDoc } from '../../SlateGraph/store/globalActions';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { updateDrawing } from './globalActions';

export interface DrawingDocument {
    name: string;
    displayName?: string;
    drawing: DrawingDataInStore;
    drawingHash: string;
    backReferences: string[]
    backReferencesHash: string;
    createdDate: Date;
    lastUpdatedDate: Date;
}

export type DrawingDocuments = {
    [id: string]: DrawingDocument;
}
/**
 * Excalidraw does mutations for performance reasons, so we need to make sure we never let
 * immer return a frozen object.
 * We do this by returning new objects, and calling 'original' on the provided draft state.
 */
const drawingsSlice = createSlice({
    name: 'drawings',
    initialState: {} as DrawingDocuments,
    reducers: {
        replaceDrawings: {
            reducer(state, { payload: { drawings }}: PayloadAction<{ drawings: DrawingDocuments }>) {
                return drawings;
            },
            prepare(drawings: DrawingDocuments) {
                return { payload: { drawings } };
            }
        },
        setDrawingTitle(state, { payload: { name, displayName }}: PayloadAction<{ name: string, displayName: string }>) {
            state[name].displayName = displayName || undefined;
        },
        createDrawing: {
            reducer(state, { payload: { drawing, drawingName, withBackref, createdDate } }: PayloadAction<{
                drawingName: string;
                drawing: DrawingData;
                withBackref?: string;
                createdDate: Date;
            }>) {
                const backReferences = withBackref ? [withBackref] : [];
                const { size, elements, files } = drawing;
                return {
                    ...state,
                    [drawingName]: {
                        name: drawingName,
                        displayName: undefined,
                        drawing: {
                            size,
                            elements,
                            filesIds: Object.keys(files ?? {})
                        },
                        drawingHash: hashSum(drawing),
                        backReferences,
                        backReferencesHash: hashSum(backReferences),
                        createdDate,
                        lastUpdatedDate: createdDate
                    }
                }
            },
            prepare: (drawingName: string, drawing: DrawingData, options?: {
                withBackref?: string;
            }) => ({
                payload: {
                    drawingName,
                    drawing,
                    withBackref: options?.withBackref,
                    createdDate: new Date()
                },
            })
        },
        deleteDrawing: {
            reducer(state, { payload }: PayloadAction<{ drawingName: string }>) {
                delete state[payload.drawingName]
            },
            prepare: (drawingName: string) => ({
                payload: { drawingName }
            })
        }
    },
    extraReducers(builder) {
        builder
        .addCase(updateDrawing, (state, { payload: { newDrawing: { files, ..._newDrawing }, drawingName, updatedDate } }: PayloadAction<{ drawingName: string; newDrawing: Partial<DrawingData>, updatedDate: Date; }>) => {
            const { backReferences, backReferencesHash, drawing: prevDrawing, drawingHash: prevDrawingHash, createdDate, displayName } = state[drawingName];
            const newDrawing = Object.assign({}, prevDrawing, _newDrawing);            
            if (typeof files !== 'undefined') {
                newDrawing.filesIds = Object.keys(files);
            }
            const newDrawingHash = hashSum(newDrawing);
            if (newDrawingHash === prevDrawingHash) {
                return;
            }
            state[drawingName] = {
                name: drawingName,
                displayName,
                drawing: newDrawing,
                drawingHash: newDrawingHash,
                backReferences,
                backReferencesHash,
                createdDate: createdDate ?? updatedDate,
                lastUpdatedDate: updatedDate
            };
        })
        .addCase(createDoc, (state, { payload: { docName, doc }}) => {
            const referencesSet = getDrawingsFromNodes(doc)
            Object.keys(state).forEach(drawingKey => {
                if (referencesSet.has(drawingKey) && !state[drawingKey].backReferences.includes(docName)) {
                    state[drawingKey].backReferences.push(docName);
                }
            })
        })
        .addCase(updateDoc, (state, { payload: { docName, newDoc, prevDoc }}) => {
            const referencesSet = getDrawingsFromNodes(newDoc);
            const prevReferencesSet = getDrawingsFromNodes(prevDoc);
            const prevReferences = Array.from(prevReferencesSet);
            
            let referencesDropped = prevReferences.filter(x => !referencesSet.has(x));
            Object.keys(state).forEach(drawingKey => {
                const backReferences = state[drawingKey].backReferences.filter(bref => !referencesDropped.includes(bref));
                if (referencesSet.has(drawingKey)) {
                    if (!state[drawingKey].backReferences.includes(docName)) {
                        backReferences.push(docName)
                    }
                }
                state[drawingKey].backReferences = backReferences;
                state[drawingKey].backReferencesHash = hashSum(backReferences);
            })
        })
        .addCase(deleteDoc, (state, { payload: { docName } }) => {
            Object.keys(state).forEach(drawingKey => {
                if (state[drawingKey].backReferences.includes(docName)) {
                    const backReferences = state[drawingKey].backReferences.filter(br => br !== docName);
                    state[drawingKey].backReferences = backReferences;
                    state[drawingKey].backReferencesHash = hashSum(backReferences);
                }
            })
        })
    },
});

export const { replaceDrawings, createDrawing, deleteDrawing, setDrawingTitle } = drawingsSlice.actions;

export default drawingsSlice.reducer;