import { getType } from 'typesafe-actions'
import { RootAction } from '../../store/action'
import * as actions from './actions';
import * as docActions from '../../SlateGraph/store/actions';
import { DrawingData } from './domain'
import hashSum from 'hash-sum';
import getDrawingsFromNodes from './util/getDrawingReferencesFromDocNodes';

export interface DrawingDocument {
    name: string;
    drawing: DrawingData;
    drawingHash: string;
    backReferences: string[]
    backReferencesHash: string;
    createdDate: Date;
    lastUpdatedDate: Date;
}

export type DrawingDocuments = {
    [id: string]: DrawingDocument;
}
const drawingsReducer = (state: DrawingDocuments = {}, action: RootAction): DrawingDocuments => {
    switch (action.type) {
        case getType(actions.replaceDrawingsAction): {
            return action.payload.drawings
        }
        // UPDATE BACKREFS WHEN DOCUMENTS CHANGE
        case getType(docActions.createDocAction): {
            const { payload: { docName, doc }} = action;
            const referencesSet = getDrawingsFromNodes(doc)
                // below is code identical to that in documents reducer. TODO extract logic to function like 'get stateWithUpdatedBackrefsFromCreateAction'
            const stateWithUpdatedBackrefsToCurrentDoc = Object.fromEntries(Object.entries(state).map((t) => {
                if (referencesSet.has(t[0]) && !t[1].backReferences.includes(docName)) {
                    return [t[0], {
                        ...t[1],
                        backReferences: [...t[1].backReferences, docName]
                    }]
                }
                return t
            }))
            return stateWithUpdatedBackrefsToCurrentDoc
        }
        case getType(docActions.updateDocAction): {
            const { payload: { docName, newDoc, prevDoc }} = action;
            const referencesSet = getDrawingsFromNodes(newDoc);
            const prevReferencesSet = getDrawingsFromNodes(prevDoc);
            const prevReferences = Array.from(prevReferencesSet);
            
            let referencesDropped = prevReferences.filter(x => !referencesSet.has(x));
            // below is code identical to that in documents reducer. TODO extract logic to function like 'get stateWithUpdatedBackrefsFromUpdateAction'
            const stateWithUpdatedBackrefsToCurrentDoc  = Object.fromEntries(Object.entries(state).map(([k, v]) => {
                let backReferences = v.backReferences.filter(bref => !referencesDropped.includes(bref));
                if (referencesSet.has(k)) {
                    if (!v.backReferences.includes(docName)) {
                        backReferences.push(docName)
                    }
                }
                return [k, {
                    ...v,
                    backReferences,
                    backReferencesHash: hashSum(backReferences)
                }]
            }))
            // end identical
            return stateWithUpdatedBackrefsToCurrentDoc;
        }
        case getType(docActions.deleteDocAction): {
            const { docName } = action.payload
           return Object.fromEntries(Object.entries(state).map(([k, drawingEntry]) => {
               if (drawingEntry.backReferences.includes(docName)) {
                   const backReferences = drawingEntry.backReferences.filter(br => br !== docName)
                   return [k, {
                       ...drawingEntry,
                       backReferences,
                       backReferencesHash: hashSum(backReferences)
                   }]
               }
               return [k, drawingEntry]
           }))
        }

        // DRAWING CRUD
        case getType(actions.createDrawingAction): {
            const { drawing, drawingName, withBackref } = action.payload;
            const backReferences = withBackref ? [withBackref] : [];
            const createdDate = new Date();
            return {
                ...state,
                [drawingName]: {
                    name: drawingName,
                    drawing,
                    drawingHash: hashSum(drawing),
                    backReferences,
                    backReferencesHash: hashSum(backReferences),
                    createdDate,
                    lastUpdatedDate: createdDate
                }
            }
        }
        case getType(actions.updateDrawingAction): {
            const { newDrawing: _newDrawing, drawingName } = action.payload;
            const { backReferences, backReferencesHash, drawing: prevDrawing, drawingHash: prevDrawingHash, createdDate } = state[drawingName]
            const newDrawing = Object.assign({}, prevDrawing, _newDrawing)
            const newDrawingHash = hashSum(newDrawing);
            if (newDrawingHash === prevDrawingHash) {
                return state;
            }
            return {
                ...state,
                [drawingName]: {
                    name: drawingName,
                    drawing: newDrawing,
                    drawingHash: newDrawingHash,
                    backReferences,
                    backReferencesHash,
                    createdDate: createdDate ?? new Date(),
                    lastUpdatedDate: new Date()
                }
            }
        }
        case getType(actions.deleteDrawingAction): {
            return Object.fromEntries(Object.entries(state).filter(([drawingName]) => {
                return drawingName !== action.payload.drawingName
            }))
        }
        default:
            return state;
        
    }
}
export default drawingsReducer;