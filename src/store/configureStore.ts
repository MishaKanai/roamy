import { configureStore, isPlain } from "@reduxjs/toolkit";
import { $CombinedState } from "@reduxjs/toolkit";
import storageSession from "redux-persist/lib/storage/session";
import { replace, routerMiddleware } from "connected-react-router";
import createRootReducer from "./createRootReducer";
import { createBrowserHistory, createHashHistory } from "history";
import { DropboxAuth, Dropbox, DropboxResponseError } from "dropbox";
import {
  getCodeFromUrl,
  hasRedirectedFromAuth,
} from "../dropbox/util/parseQueryString";
import debounce from "lodash/debounce";
import { DrawingDocuments } from "../Excalidraw/store/drawingsSlice";
import { SlateDocuments } from "../SlateGraph/store/slateDocumentsSlice";
import { mergeTriggeredAction } from "../dropbox/resolveMerge/store/actions";
import upload from "../dropbox/util/upload";
import {
  AuthorizedCollectionState,
  CollectionState,
  syncDebounceStart,
  syncFailure,
  syncStart,
  syncSuccess,
} from "../dropbox/store/activeCollectionSlice";
import getDropboxAuth from "../dropbox/singletons/getDropboxAuth";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { authSuccess, logOut } from "../dropbox/store/globalActions";
import { UploadedFiles } from "../UploadedFiles/uploadedFilesSlice";
import uniq from "lodash/uniq";
import produce from "immer";
import { RemoteFiles } from "../RemoteFiles/remoteFilesSlice";
import isSingleFile from "../util/isSingleFile";
import TokenManager from "../dropbox/util/storage";
import createAuthSyncMiddleware from "./middleware/createAuthSyncMiddleware";
import { Categories } from "../Category/store/categoriesSlice";

/**
 * https://redux-toolkit.js.org/usage/usage-guide#use-with-redux-persist
 */

const REDIRECT_URI = window.location.protocol + "//" + window.location.host;
const dbxAuth = getDropboxAuth();

export const history = isSingleFile()
  ? createHashHistory()
  : createBrowserHistory();

const persistConfig = {
  key: "root",
  storage: storageSession,
  blacklist: ["dbx", "files", "router"],
};

/**
 *
 * previously, had to make this type explicit for the export as lib:
 * by adding
 * const persistedReducer: Reducer<RootState & PersistPartial, RootAction> =
 * we got rid of
 *
 * Exported variable 'configureStore' has or is using name '$CombinedState' from external module
 * "/node_modules/redux/index" but cannot be named
 */

const persistedReducer = persistReducer(
  persistConfig,
  createRootReducer(history)
);

/*
  TODO
  - Remote is a dropbox folder, containing an index file, and all the other documents+drawings in individual files.
  - When we initially fetch, we compose our local state from all those files + the index.

  - Keep a second, local model of what we think the fully assembled JSON is like
  - When we save changes, we save only what diffs need to be made to our local model, to dropbox (so a file + maybe the index)
  - if a merge conflict occurs, we download the entire remote, and automerge/prompt.

*/

const syncDropboxToStore = (
  auth: DropboxAuth,
  store: ReturnType<typeof appConfigureStore>["store"]
) => {
  const docsPendingUpload = new Set<string>();
  const drawingsPendingUpload = new Set<string>();
  const filesPendingUpload = new Set<string>();
  const remoteFilesPendingDeletion = new Set<string>();

  const dbx = new Dropbox({ auth });

  let prevDocuments: SlateDocuments = store.getState().documents;
  let prevDrawings: DrawingDocuments = store.getState().drawings;
  let prevFiles: UploadedFiles = store.getState().files.uploadedFiles;
  let prevRemoteFiles: RemoteFiles = store.getState().files.remoteFiles;
  let prevCategories: Categories = store.getState().categories;

  const reset = () => {
    docsPendingUpload.clear();
    drawingsPendingUpload.clear();
    filesPendingUpload.clear();
    remoteFilesPendingDeletion.clear();
    const state = store.getState();
    prevDocuments = state.documents;
    prevDrawings = state.drawings;
    prevFiles = state.files.uploadedFiles;
    prevRemoteFiles = state.files.remoteFiles;
    prevCategories = state.categories;
  };

  let setPrevDocuments = (documents: SlateDocuments) => {
    prevDocuments = documents;
  };
  let setPrevDrawings = (drawings: DrawingDocuments) => {
    prevDrawings = drawings;
  };
  let setPrevFiles = (files: UploadedFiles) => {
    prevFiles = files;
  };
  let setPrevRemoteFiles = (remoteFiles: RemoteFiles) => {
    prevRemoteFiles = remoteFiles;
  };
  let setPrevCategories = (categories: Categories) => {
    prevCategories = categories;
  };

  let documentsChanged = (documents: SlateDocuments) =>
    documents !== prevDocuments;
  let drawingsChanged = (drawings: DrawingDocuments) =>
    drawings !== prevDrawings;
  let filesChanged = (files: UploadedFiles) => files !== prevFiles;
  let remoteFilesChanged = (remoteFiles: RemoteFiles) =>
    remoteFiles !== prevRemoteFiles;
  let categoriesChanged = (categories: Categories) =>
    categories !== prevCategories;
  const isAuthorized = (
    authState: CollectionState
  ): authState is AuthorizedCollectionState => {
    return authState.state === "authorized";
  };
  const sync = () => {
    const state = store.getState();
    const auth = state.dbx.auth;
    const collection = state.dbx.collection;

    if (!TokenManager.getTokens().present) {
      store.dispatch(logOut(false));
      return;
    }
    if (auth.state !== "authorized" || collection.state !== "authorized") {
      return;
    }

    const rev = collection.rev!;
    const filePath = collection.selectedFilePath;
    const {
      documents,
      drawings,
      files: { uploadedFiles },
      categories,
    } = state;

    store.dispatch(syncStart());

    upload(
      dbx,
      filePath,
      rev,
      documents,
      drawings,
      uploadedFiles,
      collection.revisions,
      docsPendingUpload,
      drawingsPendingUpload,
      filesPendingUpload,
      remoteFilesPendingDeletion,
      categories
    )
      .then(async ({ response, revisions }) => {
        store.dispatch(syncSuccess(response.result.rev, revisions));
      })
      .catch((error: DropboxResponseError<unknown>) => {
        const collection = store.getState().dbx.collection;
        if (collection.state === "authorized" && collection.rev !== rev) {
          throw new Error(
            "This shouldn't happen if we prevent debouncedSync calls while a request is currently pending" +
              " and simply mark a flag to do an extra sync after success."
          );
        } else {
          store.dispatch(syncFailure(error));
          if (error.status === 409) {
            store.dispatch(mergeTriggeredAction({ documents, drawings }));
          }
        }
      });
  };
  const debouncedSync = debounce(sync, 1000);
  let performFollowupSyncWhenRevChanges: string | null = null;

  let prevCollection: string | null = null;
  store.subscribe(() => {
    const {
      dbx: { collection },
      documents,
      files: { uploadedFiles, remoteFiles },
      drawings,
      merge,
      categories,
    } = store.getState();

    if (merge.state === "conflict") {
      // prevent sync here, because we replace documents while the merge is in the conflict state,
      // causing a debounced sync to begin, before we get to change our auth.rev,
      // leading to auth.rev !== rev in the sync function.
      return;
    }

    if (
      isAuthorized(collection) &&
      collection.selectedFilePath &&
      collection.selectedFilePath !== prevCollection
    ) {
      reset();
      prevCollection = collection.selectedFilePath;
    }
    /**
     * We need to prevent upload when we select a new (different) collection.
     * Maybe track collection selectedfilePath and clear out prevDocuments when it changes,
     * and then only upload when prevDocuments is populated.
     * (And of course, do a initialization pass where we set it on collection)
     */
    if (
      isAuthorized(collection) &&
      collection.selectedFilePath &&
      collection.rev &&
      ((performFollowupSyncWhenRevChanges &&
        performFollowupSyncWhenRevChanges !== collection.rev) ||
        documentsChanged(documents) ||
        drawingsChanged(drawings) ||
        filesChanged(uploadedFiles) ||
        remoteFilesChanged(remoteFiles) ||
        categoriesChanged(categories))
      // lets not sync based on remoteFile change - that can wait until the document creates a change.
      // just ensure we remove the entry in remoteFiles first (before the dispatch of the changed doc is sent.)
    ) {
      performFollowupSyncWhenRevChanges = null;
      if (documentsChanged(documents)) {
        // calculate different documents
        const docKeysChanged = Object.entries(documents)
          .filter(([docName, doc]) => {
            return (
              doc.documentHash !== prevDocuments[docName]?.documentHash ||
              doc.backReferencesHash !==
                prevDocuments[docName]?.backReferencesHash ||
              doc.displayName !== prevDocuments[docName]?.displayName ||
              doc.categoryId !== prevDocuments[docName]?.categoryId
            );
          })
          .map(([docName]) => docName);
        docKeysChanged.forEach((dk) => {
          docsPendingUpload.add(dk);
        });
      }
      if (drawingsChanged(drawings)) {
        // calculate different documents
        const drawingKeysChanged = Object.entries(drawings)
          .filter(([drawingName, drawing]) => {
            return (
              drawing.drawingHash !== prevDrawings[drawingName]?.drawingHash ||
              drawing.backReferencesHash !==
                prevDrawings[drawingName]?.backReferencesHash ||
              drawing.displayName !== prevDrawings[drawingName]?.displayName
            );
          })
          .map(([drawingName]) => drawingName);
        drawingKeysChanged.forEach((dk) => {
          drawingsPendingUpload.add(dk);
        });
      }
      if (filesChanged(uploadedFiles)) {
        const filesAddedOrRemoved = uniq(
          Object.keys({ ...uploadedFiles, ...prevFiles })
        ).filter((k) => {
          return !uploadedFiles[k] || !prevFiles[k];
        });
        filesAddedOrRemoved.forEach((fid) => {
          filesPendingUpload.add(fid);
        });
      }
      if (remoteFilesChanged(remoteFiles)) {
        Object.entries(prevRemoteFiles).forEach(([fileId, { count }]) => {
          if (count && !remoteFiles?.[fileId]?.count) {
            remoteFilesPendingDeletion.add(fileId);
          }
        });
        // undo/prevent pending deletions that were undone during debounce
        Object.entries(remoteFiles).forEach(([fileId, { count }]) => {
          if (count === 0) {
            return;
          }
          if (remoteFilesPendingDeletion.has(fileId)) {
            remoteFilesPendingDeletion.delete(fileId);
          }
        });
      }
      setPrevDocuments(documents);
      setPrevDrawings(drawings);
      setPrevFiles(uploadedFiles);
      setPrevRemoteFiles(remoteFiles);
      setPrevCategories(categories);

      if (
        collection.syncing?._type !== "debounced_pending" &&
        collection.syncing?._type !== "request_pending"
      ) {
        store.dispatch(syncDebounceStart());
      }
      // debouncedSync(auth.rev, auth.selectedFilePath, documents, drawings);
      if (collection.syncing?._type === "request_pending") {
        /*
        If we start attempting debounced syncs we might get into a conflict revision-wise
        where we get a revision #, start a fetch, a previous sync succeeds, and our current request hits the backend
        with an old revision #.
        */
        // lets just mark that we need to perform an extra sync after our current one succeeds.
        performFollowupSyncWhenRevChanges = collection.rev;
      } else {
        debouncedSync();
      }
    }
  });
};

const appConfigureStore = () => {
  const devTools: any = {
    actionSanitizer: (action: any) => {
      if (action["payload"]?.["fileData"]?.["dataUrl"]) {
        return produce(action, (draft: any) => {
          draft["payload"]["fileData"]["dataUrl"] = "<<LONG_B64>>";
        });
      }
      return action;
    },
    stateSanitizer: (state: any) => {
      const uploadedFiles = Object.fromEntries(
        Object.entries(state["files"]["uploadedFiles"]).map(([k, v]) => {
          const {
            fileData: { dataURL, ...restInner } = {} as any,
            ...restOuter
          } = ((v as any) = {} as any);
          return [
            k,
            {
              ...restOuter,
              fileData: {
                ...restInner,
                dataURL: "<<LONG_B64>>",
              },
            },
          ];
        })
      ) as any;

      return {
        ...state,
        uploadedFiles,
      };
    },
  };
  const singleFileState = (window as any)["INITIAL_STATE"];

  const isSerializable = (value: unknown) =>
    isPlain(value) ||
    value instanceof Date ||
    value instanceof DropboxResponseError ||
    value instanceof Error;

  const ignoredActions = [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER];
  let store = isSingleFile()
    ? configureStore({
        devTools,
        reducer: createRootReducer(history),
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              isSerializable,
              ignoredActions,
            },
          }).concat(routerMiddleware(history)),
        preloadedState: singleFileState,
      })
    : configureStore({
        devTools,
        reducer: persistedReducer,
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware({
            serializableCheck: {
              isSerializable,
              ignoredActions,
            },
          }).concat(routerMiddleware(history), createAuthSyncMiddleware()),
      });

  let persistor = isSingleFile()
    ? undefined
    : persistStore(store as any, undefined, () => {
        if (hasRedirectedFromAuth()) {
          // redirect to authed page OR set app to authorized.
          dbxAuth.setCodeVerifier(
            window.sessionStorage.getItem("codeVerifier")!
          );
          dbxAuth
            .getAccessTokenFromCode(REDIRECT_URI, getCodeFromUrl())
            .then((response) => {
              const accessToken = (response.result as any).access_token;

              const refreshToken = (response.result as any).refresh_token;
              dbxAuth.setAccessToken(accessToken);
              dbxAuth.setRefreshToken(refreshToken);

              TokenManager.setTokens({
                accessToken,
                refreshToken,
              });
              store.dispatch(authSuccess(true));

              syncDropboxToStore(dbxAuth, store);
            })
            .catch((error) => {
              console.error(error);
            });
        } else {
          const initialState = store.getState();
          if (initialState.dbx.auth.state !== "authorized") {
            console.log("not authorized");
            return;
          }
          // read this stuff from localStorage.
          const tokens = TokenManager.getTokens();
          if (!tokens.present) {
            console.log("Still not authorized.");
            store.dispatch(logOut(false));
            return;
          }
          const { accessToken, refreshToken } = tokens;
          const dbxAuth = getDropboxAuth();
          dbxAuth.setRefreshToken(refreshToken);
          dbxAuth.setAccessToken(accessToken);

          syncDropboxToStore(dbxAuth, store);
        }

        const currentPath = store.getState().router.location.pathname;
        const windowPath = window.location.pathname;

        // Only navigate if the current route is different from the persisted route
        if (currentPath !== windowPath) {
          store.dispatch(replace(currentPath));
        }
      });

  return { store, persistor };
};
export default appConfigureStore;

type Store = ReturnType<typeof appConfigureStore>["store"];
/**
 * https://stackoverflow.com/a/72030202
 */
export type RootState = ReturnType<Store["getState"]> & {
  readonly [$CombinedState]?: undefined;
};

export type AppDispatch = Store["dispatch"];
