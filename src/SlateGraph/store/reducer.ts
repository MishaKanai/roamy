import { getType } from 'typesafe-actions'
import { RootAction } from '../../store/action'
import * as actions from './actions';
import { SlateNode } from './domain'
import getReferencesFromNodes from './util/getReferencesFromNodes';
import hashSum from 'hash-sum';

export interface SlateDocument {
    name: string;
    document: SlateNode[];
    documentHash: string;
    references: string[]; // to other docs
    backReferences: string[]
    referencesHash: string;
    backReferencesHash: string;
}

type SlateDocuments = {
    [id: string]: SlateDocument;
}
const slateDocumentsReducer = (state: SlateDocuments = {}, action: RootAction): SlateDocuments => {
    switch (action.type) {
        case getType(actions.createDocAction): {
            const { payload: { docName, doc, withBackref }} = action;
            const referencesSet = getReferencesFromNodes(doc)
            const references = Array.from(referencesSet);
            const stateWithUpdatedBackrefsToCurrentDoc = Object.fromEntries(Object.entries(state).map((t) => {
                if (referencesSet.has(t[0]) && !t[1].backReferences.includes(docName)) {
                    return [t[0], {
                        ...t[1],
                        backReferences: [...t[1].backReferences, docName]
                    }]
                }
                return t
            }))
            const backReferences = withBackref ? [withBackref] : []
            return {
                ...stateWithUpdatedBackrefsToCurrentDoc,
                [docName]: {
                    name: docName,
                    document: doc,
                    documentHash: hashSum(doc),
                    references,
                    referencesHash: hashSum(references),
                    backReferences,
                    backReferencesHash: hashSum(backReferences)
                }
            }
        }
        case getType(actions.updateDocAction): {
            const { payload: { docName, newDoc }} = action;
            const referencesSet = getReferencesFromNodes(newDoc);
            const references = Array.from(referencesSet);
            const prevReferences = state[docName].references;
            
            let referencesDropped = prevReferences.filter(x => !referencesSet.has(x));

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
            const backReferences = state[docName]?.backReferences ?? [];
            return {
                ...stateWithUpdatedBackrefsToCurrentDoc,
                [docName]: {
                    name: docName,
                    document: newDoc,
                    documentHash: hashSum(newDoc),
                    references,
                    referencesHash: hashSum(references),
                    backReferences,
                    backReferencesHash: hashSum(backReferences)
                }
            }
        }
        case getType(actions.deleteDocAction): {
            // This shouldn't be called unless there aren't any references to the doc.
            const { payload: { docName }} = action;
            const { references } = state[docName];
            const hasReferencesToDocToDelete = Object.entries(state).filter(([k, v]) => v.references.includes(docName))
            if (hasReferencesToDocToDelete.length > 0) {
                console.error(`Cannot delete document "${docName}". It is referenced by the following documents: \n${
                    hasReferencesToDocToDelete.map(([k]) => k + '\n')
                }`)
                return state
            }
            // there shouldn't be any backReferences. Can maybe block this if backReferences exists with an alert or something.
            return Object.assign({}, Object.fromEntries(Object.entries(state).filter(([k]) => k !== docName)), Object.fromEntries(references.map(r => {
                const backReferences = state[r].backReferences.filter(r => r !== docName);
                return [r, {
                    ...state[r],
                    backReferences,
                    backReferencesHash: hashSum(backReferences)
                }]
            })))
        }
        default:
            return state;
        
    }
}
export default slateDocumentsReducer;