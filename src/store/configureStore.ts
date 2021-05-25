import { createStore, applyMiddleware, compose, Reducer, Store } from "redux";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import { routerMiddleware } from "connected-react-router";
import createRootReducer, { RootState } from "./createRootReducer";
import { createBrowserHistory } from "history";
import { PersistPartial } from "redux-persist/es/persistReducer";
import { RootAction } from "./action";

import { DropboxAuth, Dropbox } from "dropbox";
import parseQueryString from "../dropbox/util/parseQueryString";
import {
  authSuccessAction,
  selectFilePathAction,
} from "../dropbox/store/actions";
import debounce from "lodash/debounce";
import { DrawingDocuments } from "../Excalidraw/store/reducer";
import { SlateDocuments } from "../SlateGraph/store/reducer";
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
  let prevDocuments: SlateDocuments;
  let prevDrawings: DrawingDocuments;
  store.subscribe(
    debounce(() => {
      console.log("called");
      const state = store.getState();
      if (
        state.auth.state === "authorized" &&
        state.auth.selectedFilePath &&
        state.auth.rev &&
        // update only on data (otherwise we loop due to state update triggered from below)
        (state.documents !== prevDocuments || state.drawings !== prevDrawings)
        // TODO next step: Update only the files necessary to update.
      ) {
        console.log("ok uploading");
        dbx
          .filesUpload({
            mode: {
              ".tag": "update",
              update: state.auth.rev,
            },
            path: state.auth.selectedFilePath, // `/path/to/file-name.json`
            contents: new File(
              [
                JSON.stringify(
                  {
                    documents: state.documents,
                    drawings: state.drawings,
                  },
                  null,
                  2
                ),
              ],
              state.auth.selectedFilePath.slice(1),
              {
                type: "application/json",
              }
            ),
            // ...other dropbox args
          })
          .then((response) => {
            prevDocuments = state.documents;
            prevDrawings = state.drawings;
            store.dispatch(
              selectFilePathAction(
                response.result.path_lower!,
                response.result.rev
              )
            );
            // on success we can dispatch "upload complete" or something like that
          });
      }
    }, 2000)
  );
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
