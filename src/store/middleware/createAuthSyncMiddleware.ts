import { BroadcastChannel } from "broadcast-channel";
import TokenManager from "../../dropbox/util/storage";
import { authSuccess, logOut } from "../../dropbox/store/globalActions";
import { Middleware } from "@reduxjs/toolkit";

const createAuthSyncMiddleware = (): Middleware => {
  const authChannel = new BroadcastChannel("auth_channel");

  return (store) => (next) => (action) => {
    // Handle incoming actions
    if (authSuccess.match(action)) {
      if (action.payload.propagate) {
        authChannel.postMessage({ type: "LOGIN" });
      }
    }
    if (logOut.match(action)) {
      if (action.payload.clearAllStorage) {
        authChannel.postMessage({ type: "LOGOUT" });
        TokenManager.clearTokens();
        indexedDB
          .databases()
          .then((dbs) => {
            dbs.forEach((db) => db.name && indexedDB.deleteDatabase(db.name));
            return Promise.allSettled(
              dbs.flatMap(({ name }) => {
                if (!name) return [];
                return [
                  new Promise<void>((res, rej) => {
                    const DBDeleteRequest = indexedDB.deleteDatabase(name);
                    DBDeleteRequest.onerror = (err) => rej(err);
                    DBDeleteRequest.onsuccess = (event) => res();
                  }),
                ];
              })
            );
          })
          .finally(() => {
            // any necessary cleanup.
          });
      }
    }

    // Listen to messages from other tabs
    authChannel.onmessage = (message) => {
      if (message.type === "LOGOUT") {
        TokenManager.clearTokens();
        store.dispatch(logOut(false));
      }
      if (message.type === "LOGIN") {
        const tokens = TokenManager.getTokens();
        if (tokens.present) {
          store.dispatch(authSuccess());
        }
      }
    };

    return next(action);
  };
};

export default createAuthSyncMiddleware;
