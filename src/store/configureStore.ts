import { createStore, applyMiddleware, compose, Reducer, Store } from "redux";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import { routerMiddleware } from "connected-react-router";
import createRootReducer, { RootState } from "./createRootReducer";
import { createBrowserHistory } from "history";
import { PersistPartial } from "redux-persist/es/persistReducer";
import { RootAction } from "./action";

import { DropboxAuth, Dropbox, files } from "dropbox";
import parseQueryString from "../dropbox/util/parseQueryString";
import {
  authSuccessAction,
  selectFilePathAction,
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
// aka app key
const CLIENT_ID = "9r1uwr2l55chuy7";
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

const syncDropboxToStore = (
  accessToken: string,
  store: Store<RootState & PersistPartial, RootAction>
) => {
  console.log("syncDropboxToStore");
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
  const debouncedSync = debounce(
    (
      rev: string,
      filePath: string,
      documents: SlateDocuments,
      drawings: DrawingDocuments
    ) => {
      store.dispatch(syncStartAction());
      dbx
        .filesUpload({
          mode: {
            ".tag": "update",
            update: rev,
          },
          path: filePath, // `/path/to/file-name.json`
          contents: new File(
            [
              JSON.stringify(
                {
                  documents,
                  drawings,
                },
                null,
                2
              ),
            ],
            filePath.slice(1),
            {
              type: "application/json",
            }
          ),
          // ...other dropbox args
        })
        .then((response) => {
          // setPrevDocuments(documents);
          // setPrevDrawings(drawings);
          store.dispatch(syncSuccessAction(response.result.rev));
          // on success we can dispatch "upload complete" or something like that
        })
        .catch((error: files.UploadError) => {
          // if we dont setPrev here, we will loop because the dispatched failure
          // will trigger the subscriber and it will see the documents don't match the cached ones
          // setPrevDocuments(documents);
          // setPrevDrawings(drawings);
          store.dispatch(syncFailureAction(error));
        });
    },
    1000
  );
  store.subscribe(() => {
    const { auth, documents, drawings } = store.getState();
    if (
      isAuthorized(auth) &&
      auth.selectedFilePath &&
      auth.rev &&
      (documentsChanged(documents) || drawingsChanged(drawings))
    ) {
      setPrevDocuments(documents);
      setPrevDrawings(drawings);
      if (
        auth.syncing._type !== "debounced_pending" &&
        auth.syncing._type !== "request_pending"
      ) {
        store.dispatch(syncDebounceStartAction());
      }
      debouncedSync(auth.rev, auth.selectedFilePath, documents, drawings);
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
        });
      // .catch((error) => {
      //   console.error(error);
      // });
    } else {
      const initialState = store.getState();
      console.log({
        initialState,
      });
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
