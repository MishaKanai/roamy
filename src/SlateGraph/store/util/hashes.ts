import hashSum from 'hash-sum';
import { SlateDocument, SlateDocuments } from '../slateDocumentsSlice';

export const addHashesToDoc = (document: Omit<SlateDocument, 'documentHash' | 'referencesHash' | 'backReferencesHash'>): SlateDocument => {
    return {
        ...document,
        documentHash: hashSum(document.document),
        referencesHash: hashSum(document.references),
        backReferencesHash: hashSum(document.backReferences)
    }
}
export const addHashesToDocs = (documents: ReturnType<typeof removeHashesFromDocs>): SlateDocuments => {
    return Object.fromEntries(Object.entries(documents).map(([k, v]) => [k, addHashesToDoc(v)]));
}

export const removeHashesFromDoc = (document: SlateDocument) => {
    const { documentHash, referencesHash, backReferencesHash, ...rest } = document;
    return rest;
}
export const removeHashesFromDocs = (documents: SlateDocuments) => {
    return Object.fromEntries(Object.entries(documents).map(([k, v]) => [k, removeHashesFromDoc(v)]));
}