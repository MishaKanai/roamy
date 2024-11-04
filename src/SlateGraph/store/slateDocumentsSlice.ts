import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import getReferencesFromNodes from "./util/getReferencesFromNodes";
import hashSum from "hash-sum";
import { Descendant } from "slate";
import { createDoc, deleteDoc, updateDoc } from "./globalActions";

export interface SlateDocument {
  name: string;
  displayName?: string;
  document: Descendant[];
  documentHash: string;
  references: string[]; // to other docs
  backReferences: string[];
  referencesHash: string;
  backReferencesHash: string;
  createdDate: Date;
  lastUpdatedDate: Date;
  categoryId?: string;
}

export type SlateDocuments = {
  [id: string]: SlateDocument;
};

const slateDocumentsSlice = createSlice({
  name: "documents",
  initialState: {} as SlateDocuments,
  reducers: {
    replaceDocs: {
      reducer(state, action: PayloadAction<{ docs: SlateDocuments }>) {
        return action.payload.docs;
      },
      prepare: (docs: SlateDocuments) => ({
        payload: { docs },
      }),
    },
    setTitle(
      state,
      {
        payload: { name, displayName },
      }: PayloadAction<{ name: string; displayName?: string }>
    ) {
      state[name].displayName = displayName || undefined;
    },
    setCategoryId(
      state,
      {
        payload: { name, categoryId },
      }: PayloadAction<{ name: string; categoryId: string | null }>
    ) {
      state[name].categoryId = categoryId || undefined;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(
        createDoc,
        (state, { payload: { docName, doc, withBackref, createdDate } }) => {
          const referencesSet = getReferencesFromNodes(doc);
          const references = Array.from(referencesSet);

          Object.keys(state).forEach((docKey) => {
            if (
              referencesSet.has(docKey) &&
              !state[docKey].backReferences.includes(docName)
            ) {
              state[docKey].backReferences.push(docName);
            }
          });
          const backReferences = withBackref ? [withBackref] : [];
          state[docName] = {
            name: docName,
            document: doc,
            documentHash: hashSum(doc),
            references,
            referencesHash: hashSum(references),
            backReferences,
            backReferencesHash: hashSum(backReferences),
            createdDate,
            lastUpdatedDate: createdDate,
          };
        }
      )
      .addCase(
        updateDoc,
        (state, { payload: { docName, newDoc, updatedDate } }) => {
          const referencesSet = getReferencesFromNodes(newDoc);
          const references = Array.from(referencesSet);
          const prevReferences = state[docName].references;
          const referencesDropped = prevReferences.filter(
            (x) => !referencesSet.has(x)
          );
          Object.keys(state).forEach((docKey) => {
            const backReferences = referencesDropped.includes(docKey)
              ? state[docKey].backReferences.filter((bref) => bref !== docName)
              : state[docKey].backReferences;
            if (referencesSet.has(docKey)) {
              if (!state[docKey].backReferences.includes(docName)) {
                backReferences.push(docName);
              }
            }
            state[docKey].backReferences = backReferences;
            state[docKey].backReferencesHash = hashSum(backReferences);
          });
          const backReferences = state[docName]?.backReferences ?? [];
          state[docName] = {
            name: docName,
            displayName: state[docName].displayName,
            document: newDoc,
            documentHash: hashSum(newDoc),
            references,
            referencesHash: hashSum(references),
            backReferences,
            backReferencesHash: hashSum(backReferences),
            createdDate: state[docName]?.createdDate ?? updatedDate,
            lastUpdatedDate: updatedDate,
            categoryId: state[docName].categoryId,
          };
        }
      )
      .addCase(deleteDoc, (state, { payload: { docName } }) => {
        // This shouldn't be called unless there aren't any references to the doc.
        const { references } = state[docName];
        const hasReferencesToDocToDelete = Object.entries(state).filter(
          ([k, v]) => v.references.includes(docName)
        );
        if (hasReferencesToDocToDelete.length > 0) {
          console.error(
            `Cannot delete document "${docName}". It is referenced by the following documents: \n${hasReferencesToDocToDelete.map(
              ([k]) => k + "\n"
            )}`
          );
          return state;
        }
        // there shouldn't be any backReferences. Can maybe block this if backReferences exists with an alert or something.
        delete state[docName];
        references.forEach((r) => {
          const backReferences = state[r].backReferences.filter(
            (r) => r !== docName
          );
          state[r].backReferences = backReferences;
          state[r].backReferencesHash = hashSum(backReferences);
        });
      });
  },
});

export const { replaceDocs, setTitle, setCategoryId } =
  slateDocumentsSlice.actions;
export default slateDocumentsSlice.reducer;
