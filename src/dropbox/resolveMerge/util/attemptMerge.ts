import slateDocumentsReducer, {
  setTitle,
  SlateDocuments,
} from "../../../SlateGraph/store/slateDocumentsSlice";
import { updateDrawing } from "../../../Excalidraw/store/globalActions";
import drawingsReducer, {
  DrawingDocuments,
} from "../../../Excalidraw/store/drawingsSlice";
import trimerge from "../trimerge/trimerge";
import {
  createDoc,
  deleteDoc,
  updateDoc,
} from "../../../SlateGraph/store/globalActions";
import convertDrawingInStoreToDispatchedDrawing from "./convertDrawingFromStoreRepToDispatchedRep";

const attemptMerge = (args: {
  documents: {
    left: SlateDocuments;
    right: SlateDocuments;
    initial: SlateDocuments;
  };
  drawings: {
    left: DrawingDocuments;
    right: DrawingDocuments;
    initial: DrawingDocuments;
  };
}) => {
  const {
    documents: { left, right, initial },
    drawings: {
      left: leftDrawings,
      right: rightDrawings,
      initial: initialDrawings,
    },
  } = args;

  let mergedState: {
    documents: SlateDocuments;
    drawings: DrawingDocuments;
  } = {
    documents: left,
    drawings: {
      // adding all drawings here so adjustments to their backrefs can be made while merging docs.
      // at the end we can go through and delete any drawings, and flag any we need to merge.
      ...rightDrawings,
      ...leftDrawings,
    },
  };
  let docsNeedingMerge: string[] = [];

  const applyAction = (
    action:
      | ReturnType<typeof deleteDoc>
      | ReturnType<typeof createDoc>
      | ReturnType<typeof updateDoc>
      | ReturnType<typeof updateDrawing>
      | ReturnType<typeof setTitle>
  ) => {
    mergedState.documents = slateDocumentsReducer(
      mergedState.documents,
      action
    );
    mergedState.drawings = drawingsReducer(mergedState.drawings, action);
  };
  // add documents from the right that are missing from left and initial
  Object.keys(right)
    .filter((docKey) => !mergedState.documents[docKey] && !initial[docKey])
    .forEach((docKey) => {
      applyAction(createDoc(docKey, right[docKey].document));
    });
  // if missing from just left, and not initial, it was deleted, so we can ignore.
  // if missing from initial, and not left, we both added the same doc, and so we should merge it.

  Object.keys(mergedState.documents).forEach((docKey) => {
    const leftDoc = left[docKey],
      initialDoc = initial[docKey],
      rightDoc = right[docKey];

    const addNeedsMerge = (docKey: string) => {
      docsNeedingMerge.push(docKey);
    };
    if (!initialDoc) {
      if (!rightDoc) {
        // we just added this doc, and so no merge is necessary
        return;
      }
      // we both added this doc, and they have different content.
      if (
        leftDoc &&
        (leftDoc.documentHash !== rightDoc.documentHash ||
          (leftDoc.displayName !== rightDoc.displayName && leftDoc.displayName))
      ) {
        addNeedsMerge(docKey);
      }
      return;
    } else if (!rightDoc) {
      // right side deleted it...
      if (
        initialDoc.documentHash === leftDoc.documentHash &&
        initialDoc.displayName === leftDoc.displayName
      ) {
        // we can delete it since we made no local changes.
        applyAction(deleteDoc(docKey));
        return;
      } else {
        // need to pick keep with changes, or delete;
        addNeedsMerge(docKey);
        return;
      }
    } else if (
      leftDoc.documentHash === rightDoc.documentHash &&
      leftDoc.displayName === rightDoc.displayName
    ) {
      // no change.
      return;
    } else {
      try {
        if (initialDoc.displayName === leftDoc.displayName) {
          applyAction(
            setTitle({
              name: initialDoc.name,
              displayName: rightDoc.displayName,
            })
          );
        } else if (initialDoc.displayName === rightDoc.displayName) {
          applyAction(
            setTitle({
              name: initialDoc.name,
              displayName: leftDoc.displayName,
            })
          );
        }
        const mergedDoc = trimerge(
          initialDoc.document,
          leftDoc.document,
          rightDoc.document
        );
        if (mergedDoc) {
          applyAction(updateDoc(docKey, mergedDoc, leftDoc.document));
          return;
        }
      } catch (e) {
        // needs manual merge
        console.error(e);
        addNeedsMerge(docKey);
      }
    }
  });

  // now we can go through remaining drawings and flag for merge if necessary.
  const drawingsNeedingMerge: string[] = [];
  Object.keys(leftDrawings).forEach((drawingKey) => {
    const rightDrawing = rightDrawings[drawingKey],
      leftDrawing = leftDrawings[drawingKey],
      initialDrawing = initialDrawings[drawingKey];
    if (!rightDrawing) {
      if (leftDrawing.drawingHash === initialDrawing.drawingHash) {
        // if there are still references to this in the automerged state, lets mark it for manual review
        if (mergedState.drawings[drawingKey].backReferences.length === 0) {
          delete mergedState.drawings[drawingKey];
        } else {
          drawingsNeedingMerge.push(drawingKey);
        }
        // should we add this as a
      } else {
        // left made a change, so we have a conflict.
        drawingsNeedingMerge.push(drawingKey);
      }
    } else if (leftDrawing.drawingHash !== rightDrawing.drawingHash) {
      // if only one was changed, apply update. otherwise flag for merge
      if (leftDrawing.drawingHash === initialDrawing.drawingHash) {
        // right was updated
        applyAction(
          updateDrawing(
            drawingKey,
            convertDrawingInStoreToDispatchedDrawing(rightDrawing.drawing)
          )
        );
      } else if (rightDrawing.drawingHash === initialDrawing.drawingHash) {
        applyAction(
          updateDrawing(
            drawingKey,
            convertDrawingInStoreToDispatchedDrawing(leftDrawing.drawing)
          )
        );
      } else {
        drawingsNeedingMerge.push(drawingKey);
      }
    }
  });
  // delete any 'right' drawings that we deleted on the left side.

  return [mergedState, docsNeedingMerge, drawingsNeedingMerge] as [
    typeof mergedState,
    string[],
    string[]
  ];
};
export default attemptMerge;
