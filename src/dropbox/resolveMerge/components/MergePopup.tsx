import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import LoadingOverlay from "react-loading-overlay-ts";
import { Dialog } from "@mui/material";
import { useStore } from "react-redux";
import useFetchCurrentDoc from "../../hooks/useFetchCurrentDoc";
import { SlateDocuments } from "../../../SlateGraph/store/slateDocumentsSlice";
import {
  DrawingDocuments,
  replaceDrawings,
} from "../../../Excalidraw/store/drawingsSlice";
import { DropboxResponseError } from "dropbox";
import useDbx from "../../hooks/useDbx";
import ResolveConflicts from "./ResolveConflicts";
import { mergeTriggeredAction } from "../store/actions";
import attemptMerge from "../util/attemptMerge";
import upload from "../../util/upload";
import { useAppSelector } from "../../../store/hooks";
import { RootState } from "../../../store/configureStore";
import { syncSuccess } from "../../store/activeCollectionSlice";
import { replaceDocs } from "../../../SlateGraph/store/slateDocumentsSlice";
import {
  replaceFiles,
  UploadedFiles,
} from "../../../UploadedFiles/uploadedFilesSlice";
import getFilesToDrawings from "../../util/getFilesToDrawings";
import getFilesToDocs from "../../util/getFilesToDocx";
import getFileCounts from "../../util/getFileCounts";
import { replaceRemoteFiles } from "../../../RemoteFiles/remoteFilesSlice";
import {
  Categories,
  replaceCategories,
} from "../../../Category/store/categoriesSlice";

const useAutomerge = () => {
  const _lastRev = useAppSelector(
    (state) =>
      state.dbx.collection.state === "authorized" && state.dbx.collection.rev
  );
  const lastRevRef = useRef(_lastRev);
  const documents = useAppSelector((state) => state.documents);
  const drawings = useAppSelector((state) => state.drawings);
  const uploadedFiles = useAppSelector((state) => state.files.uploadedFiles);
  const categories = useAppSelector((state) => state.categories);
  const { state, fetchCurrentDoc } = useFetchCurrentDoc();
  const { state: lastRevState, fetchCurrentDoc: fetchLastRevDoc } =
    useFetchCurrentDoc();
  useEffect(() => {
    if (!lastRevRef.current) {
      return;
    }
    fetchLastRevDoc(lastRevRef.current);
  }, [fetchLastRevDoc]);
  useEffect(() => {
    fetchCurrentDoc();
  }, [fetchCurrentDoc]);

  type AutomergeState =
    | {
        type: "waiting_for_data";
      }
    | ({
        type: "failed";
        reason: "failed_fetch" | "merge_conflict";
      } & (
        | {
            reason: "failed_fetch";
          }
        | {
            reason: "merge_conflict";
            remoteRev: string;
            initial: SlateDocuments;
            left: SlateDocuments;
            right: SlateDocuments;
            initialDrawings: DrawingDocuments;
            leftDrawings: DrawingDocuments;
            rightDrawings: DrawingDocuments;
            combinedFiles: UploadedFiles;
            combinedCategories: Categories;
          }
      ))
    | {
        type: "succeeded";
        mergedDocs: SlateDocuments;
        mergedDrawings: DrawingDocuments;
        remoteRev: string;
        combinedFiles: UploadedFiles;
        combinedCategories: Categories;
      };
  const [autoMergeState, setAutomergeState] = useState<AutomergeState>({
    type: "waiting_for_data",
  });
  const lastStateTypeRef = useRef(state.type);
  const lastRevStateTypeRef = useRef(lastRevState.type);
  useEffect(() => {
    if (
      state.type === "success" &&
      lastRevState.type === "success" &&
      (lastRevStateTypeRef.current !== "success" ||
        lastStateTypeRef.current !== "success")
    ) {
      const initialDrawings = lastRevState.data.drawings;
      const leftDrawings = drawings;
      const rightDrawings = state.data.drawings;
      // null means cannot automerge
      const left = documents;
      const right = state.data.documents;
      const initial = lastRevState.data.documents;

      const [mergedState, docsNeedingMerge, drawingsNeedingMerge] =
        attemptMerge({
          documents: {
            left,
            right,
            initial,
          },
          drawings: {
            left: leftDrawings,
            right: rightDrawings,
            initial: initialDrawings,
          },
        });

      if (docsNeedingMerge.length > 0 || drawingsNeedingMerge.length > 0) {
        setAutomergeState({
          type: "failed",
          reason: "merge_conflict",
          remoteRev: state.rev,
          initial,
          left,
          right,
          leftDrawings,
          rightDrawings,
          initialDrawings,
          combinedFiles: {
            // I need to use 'uploadedFiles' here because our latest files haven't been uploaded yet.
            ...uploadedFiles,
            ...lastRevState.data.uploadedFiles,
            ...state.data.uploadedFiles,
          },
          combinedCategories: {
            ...categories,
            ...lastRevState.data.categories,
            ...state.data.categories,
          },
        });
      } else {
        setAutomergeState({
          type: "succeeded",
          mergedDocs: mergedState.documents,
          mergedDrawings: mergedState.drawings,
          remoteRev: state.rev,
          combinedFiles: {
            ...uploadedFiles,
            ...lastRevState.data.uploadedFiles,
            ...state.data.uploadedFiles,
          },
          combinedCategories: {
            ...categories,
            ...lastRevState.data.categories,
            ...state.data.categories,
          },
        });
      }
    }
    lastStateTypeRef.current = state.type;
    lastRevStateTypeRef.current = lastRevState.type;
  }, [
    state,
    lastRevState,
    setAutomergeState,
    documents,
    drawings,
    uploadedFiles,
  ]);

  const someFetchError = Boolean(
    state.type === "error" || lastRevState.type === "error"
  );

  useEffect(() => {
    if (someFetchError) {
      setAutomergeState({ type: "failed", reason: "failed_fetch" });
    }
  }, [someFetchError, setAutomergeState]);

  return autoMergeState;
};

export const useSubmitMergedDoc = () => {
  const dbx = useDbx();
  const store = useStore<RootState>();
  const submitMergedDoc = useCallback(
    (
      documents: SlateDocuments,
      drawings: DrawingDocuments,
      uploadedFiles: UploadedFiles,
      remoteRev: string,
      categories: Categories
    ) => {
      const state = store.getState();
      const collection = state.dbx.collection;
      const filePath =
        collection.state === "authorized" && collection.selectedFilePath;
      if (!dbx || !filePath) {
        return;
      }
      const docsPendingUpload = new Set<string>();
      Object.values(documents).forEach((doc) => {
        const existingDoc = state.documents[doc.name];
        if (
          !existingDoc ||
          doc.documentHash !== existingDoc.documentHash ||
          doc.backReferencesHash !== existingDoc.backReferencesHash
        ) {
          docsPendingUpload.add(doc.name);
        }
      });
      const drawingsPendingUpload = new Set<string>();
      const filesPendingUpload = new Set<string>();
      Object.values(drawings).forEach((drawing) => {
        const existingDrawing = state.drawings[drawing.name];
        if (
          !existingDrawing ||
          drawing.drawingHash !== existingDrawing.drawingHash ||
          drawing.backReferencesHash !== existingDrawing.backReferencesHash
        ) {
          drawingsPendingUpload.add(drawing.name);
          drawing.drawing.filesIds.forEach((fileId) => {
            if (
              !existingDrawing ||
              !existingDrawing.drawing.filesIds.includes(fileId)
            ) {
              filesPendingUpload.add(fileId);
            }
          });
        }
      });
      const filesToDrawings = getFilesToDrawings(drawings);
      const filesToDocs = getFilesToDocs(documents);
      const newUploadedFiles = Object.keys({
        ...filesToDrawings,
        ...filesToDocs,
      }).reduce((prev, fileId) => {
        prev[fileId] = uploadedFiles[fileId];
        return prev;
      }, {} as UploadedFiles);

      const newRemoteFiles = getFileCounts(documents);

      store.dispatch(replaceFiles(newUploadedFiles));
      store.dispatch(replaceDocs(documents));
      store.dispatch(replaceDrawings(drawings));
      store.dispatch(replaceCategories(categories));
      store.dispatch(replaceRemoteFiles({ remoteFiles: newRemoteFiles }));
      const remoteFilesToDelete = new Set<string>();
      // lets not delete anything on merge conflict resolves right now,
      // because I would rather not delete something another user wants to keep around.
      // we can add a 'review' page for cleaning up garbage.

      upload(
        dbx,
        filePath,
        remoteRev,
        documents,
        drawings,
        uploadedFiles,
        collection.revisions,
        docsPendingUpload,
        drawingsPendingUpload,
        filesPendingUpload,
        remoteFilesToDelete,
        categories
      )
        .then(({ response, revisions }) => {
          store.dispatch(syncSuccess(response.result.rev, revisions));
        })
        .catch((error: DropboxResponseError<unknown>) => {
          if (error.status === 409) {
            store.dispatch(mergeTriggeredAction({ documents, drawings }));
          }
        });
    },
    [dbx, store]
  );
  return submitMergedDoc;
};

export const MergeEditorWrap: React.FC<{}> = ({ children }) => {
  const mergeState = useAppSelector((state) => state.merge);
  const [key, refresh] = useReducer((state: number) => state + 1, 1);
  if (mergeState.state === "conflict") {
    return (
      <MergeWrapper key={key + ":" + mergeState.key} retry={refresh}>
        {children}
      </MergeWrapper>
    );
  }
  return <>{children}</>;
};

export const MergeWrapper: React.FC<{
  children: React.ReactNode;
  retry: () => void;
}> = ({ children, retry }) => {
  const autoMergeState = useAutomerge();
  const submitMerge = useSubmitMergedDoc();
  const lastAutoMergeStateType = useRef(autoMergeState.type);
  useEffect(() => {
    if (
      lastAutoMergeStateType.current !== "succeeded" &&
      autoMergeState.type === "succeeded"
    ) {
      submitMerge(
        autoMergeState.mergedDocs,
        autoMergeState.mergedDrawings,
        autoMergeState.combinedFiles,
        autoMergeState.remoteRev,
        autoMergeState.combinedCategories
      );
    }
    lastAutoMergeStateType.current = autoMergeState.type;
  }, [autoMergeState, submitMerge]);

  const displayOverlay = autoMergeState.type === "waiting_for_data";
  return (
    <>
      {autoMergeState.type === "failed" ? (
        <Dialog fullScreen open={true}>
          {autoMergeState.reason === "merge_conflict" ? (
            // pass 'all files' in here as a set-
            // we can remove unused ones on the actual submission.
            <ResolveConflicts
              combinedFiles={autoMergeState.combinedFiles}
              remoteRev={autoMergeState.remoteRev}
              left={autoMergeState.left}
              right={autoMergeState.right}
              initial={autoMergeState.initial}
              leftDrawings={autoMergeState.leftDrawings}
              rightDrawings={autoMergeState.rightDrawings}
              initialDrawings={autoMergeState.initialDrawings}
              combinedCategories={autoMergeState.combinedCategories}
            />
          ) : (
            <div>
              Retry?<button onClick={retry}>Retry</button>
            </div>
          )}
        </Dialog>
      ) : null}
      {/*
            TODO:
            LoadingOverlay calls findDOMNode internally:
            need to figure out how to short-cirucit that through its API,
            or use a different library.
        */}
      <LoadingOverlay active={displayOverlay} spinner text="Automerging...">
        <div>{children}</div>
      </LoadingOverlay>
    </>
  );
};

export default MergeEditorWrap;
