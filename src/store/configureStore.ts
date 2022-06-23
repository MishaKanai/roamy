import { createStore, applyMiddleware, compose, Reducer, Store } from "redux";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import { routerMiddleware } from "connected-react-router";
import createRootReducer, { RootState } from "./createRootReducer";
import { createBrowserHistory } from "history";
import { PersistPartial } from "redux-persist/es/persistReducer";
import { RootAction } from "./action";

import { DropboxAuth, Dropbox, DropboxResponseError } from "dropbox";
import parseQueryString from "../dropbox/util/parseQueryString";
import {
  authSuccessAction,
  syncDebounceStartAction,
  syncFailureAction,
  syncStartAction,
  syncSuccessAction,
} from "../dropbox/store/actions";
import debounce from "lodash/debounce";
import { DrawingDocuments } from "../Excalidraw/store/reducer";
import { SlateDocuments } from "../SlateGraph/store/reducer";
import {
  AuthorizedAuthState,
  DropboxAuthState,
} from "../dropbox/store/reducer";
import { mergeTriggeredAction } from "../dropbox/resolveMerge/store/actions";
import upload from "../dropbox/util/upload";
// aka app key
const CLIENT_ID = "24bu717gh43au0o";
const REDIRECT_URI = window.location.protocol + "//" + window.location.host;
const dbxAuth = new DropboxAuth({
  clientId: CLIENT_ID,
});

// Parses the url and gets the access token if it is in the urls hash
function getCodeFromUrl() {
  return parseQueryString(window.location.search).code;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function hasRedirectedFromAuth() {
  return !!getCodeFromUrl();
}

export const history = createBrowserHistory();

const persistConfig = {
  key: "root",
  storage,
  blacklist: ['auth']
};

// had to make this type explicit for the export as lib:
/*
 Exported variable 'configureStore' has or is using name '$CombinedState' from external module
 "/node_modules/redux/index" but cannot be named
*/
const persistedReducer: Reducer<RootState & PersistPartial, RootAction> =
  persistReducer(persistConfig, createRootReducer(history));

const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

/*
  TODO
  - Remote is a dropbox folder, containing an index file, and all the other documents+drawings in individual files.
  - When we initially fetch, we compose our local state from all those files + the index.

  - Keep a second, local model of what we think the fully assembled JSON is like
  - When we save changes, we save only what diffs need to be made to our local model, to dropbox (so a file + maybe the index)
  - if a merge conflict occurs, we download the entire remote, and automerge/prompt.

*/
const syncDropboxToStore = (
  accessToken: string,
  store: Store<RootState & PersistPartial, RootAction>
) => {
  const docsPendingUpload = new Set<string>();
  const drawingsPendingUpload = new Set<string>();

  const dbx = new Dropbox({ accessToken });

  let prevDocuments: SlateDocuments = store.getState().documents;
  let prevDrawings: DrawingDocuments = store.getState().drawings;
  let setPrevDocuments = (documents: SlateDocuments) => {
    prevDocuments = documents;
  };
  let setPrevDrawings = (drawings: DrawingDocuments) => {
    prevDrawings = drawings;
  };
  let documentsChanged = (documents: SlateDocuments) =>
    documents !== prevDocuments;
  let drawingsChanged = (drawings: DrawingDocuments) =>
    drawings !== prevDrawings;
  const isAuthorized = (
    authState: DropboxAuthState
  ): authState is AuthorizedAuthState => {
    return authState.state === "authorized";
  };
  const sync = () => {
    const state = store.getState();
    const auth = state.auth;
    if (auth.state !== 'authorized') {
      return;
    }

    const rev = auth.rev!;
    const filePath = auth.selectedFilePath;
    const { documents, drawings } = state;

    store.dispatch(syncStartAction());

    upload(dbx,
      filePath,
      rev,
      documents,
      drawings,
      auth.revisions,
      docsPendingUpload,
      drawingsPendingUpload)
      .then(async ({response, revisions }) => {
        store.dispatch(syncSuccessAction(response.result.rev, revisions));
      })
      .catch((error: DropboxResponseError<unknown>) => {
        const auth = store.getState().auth;
        if (auth.state === 'authorized' && auth.rev !== rev) {
          throw new Error('This shouldn\'t happen if we prevent debouncedSync calls while a request is currently pending' +
            ' and simply mark a flag to do an extra sync after success.');
        } else {
          store.dispatch(syncFailureAction(error));
          if (error.status === 409) {
            store.dispatch(mergeTriggeredAction({ documents, drawings }))
          }
        }
      });
  }
  const debouncedSync = debounce(
    sync,
    1000
  );
  let performFollowupSyncWhenRevChanges: string | null = null;
  store.subscribe(() => {
    const { auth, documents, drawings, merge } = store.getState();
    if (merge.state === 'conflict') {
      // prevent sync here, because we replace documents while the merge is in the conflict state,
      // causing a debounced sync to begin, before we get to change our auth.rev,
      // leading to auth.rev !== rev in the sync function.
      return;
    }
    if (
      isAuthorized(auth) &&
      auth.selectedFilePath &&
      auth.rev &&
      (
        (performFollowupSyncWhenRevChanges && performFollowupSyncWhenRevChanges !== auth.rev) ||
        (documentsChanged(documents) || drawingsChanged(drawings))
      )
    ) {
      performFollowupSyncWhenRevChanges = null;
      if (documentsChanged(documents)) {
        // calculate different documents
        const docKeysChanged = Object.entries(documents).filter(([docName, doc]) => {
          return doc.documentHash !== prevDocuments[docName]?.documentHash ||
            doc.backReferencesHash !== prevDocuments[docName]?.backReferencesHash
        }).map(([docName]) => docName);
        docKeysChanged.forEach(dk => {
          docsPendingUpload.add(dk);
        })
      }
      if (drawingsChanged(drawings)) {
        // calculate different documents
        const drawingKeysChanged = Object.entries(drawings).filter(([drawingName, drawing]) => {
          return drawing.drawingHash !== prevDrawings[drawingName]?.drawingHash ||
            drawing.backReferencesHash !== prevDrawings[drawingName]?.backReferencesHash
        }).map(([drawingName]) => drawingName);
        drawingKeysChanged.forEach(dk => {
          drawingsPendingUpload.add(dk);
        })
      }
      setPrevDocuments(documents);
      setPrevDrawings(drawings);
      if (
        auth.syncing?._type !== "debounced_pending" &&
        auth.syncing?._type !== "request_pending"
      ) {
        store.dispatch(syncDebounceStartAction());
      }
      // debouncedSync(auth.rev, auth.selectedFilePath, documents, drawings);
      if (auth.syncing?._type === 'request_pending') {
        /*
        If we start attempting debounced syncs we might get into a conflict revision-wise
        where we get a revision #, start a fetch, a previous sync succeeds, and our current request hits the backend
        with an old revision #.
        */
        // lets just mark that we need to perform an extra sync after our current one succeeds.
        performFollowupSyncWhenRevChanges = auth.rev;
      } else {
        debouncedSync();
      }
    }
  });
};

const configureStore = () => {
  let store = createStore(
    persistedReducer,
    compose(composeEnhancers(applyMiddleware(routerMiddleware(history))))
  );
  let persistor = persistStore(store as any, undefined, () => {
    if (hasRedirectedFromAuth()) {
      // redirect to authed page OR set app to authorized.
      dbxAuth.setCodeVerifier(window.sessionStorage.getItem("codeVerifier")!);
      dbxAuth
        .getAccessTokenFromCode(REDIRECT_URI, getCodeFromUrl())
        .then((response) => {
          const accessToken = (response.result as any).access_token;
          store.dispatch(authSuccessAction(accessToken));
          syncDropboxToStore(accessToken, store);
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      const initialState = store.getState();
      const accessToken =
        initialState.auth.state === "authorized" &&
        initialState.auth.accessToken;
      if (accessToken) {
        syncDropboxToStore(accessToken, store);
      }
    }
  });
  return { store, persistor };
};
export default configureStore;
