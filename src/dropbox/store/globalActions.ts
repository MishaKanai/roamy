import { createAction } from "@reduxjs/toolkit";
import { Revisions } from "./activeCollectionSlice";

export const authSuccess = createAction(
  "dropbox/authSuccess",
  (propagate: boolean = false) => {
    return {
      payload: {
        propagate,
      },
    };
  }
);

export const logOut = createAction(
  "dropbox/loggedOut",
  (clearAllStorage: boolean) => {
    return {
      payload: {
        clearAllStorage,
      },
    };
  }
);

export const selectFilePath = createAction(
  "dropbox/selectFilePath",
  (path: string, rev: string, revisions: Revisions) => ({
    payload: {
      path,
      rev,
      revisions,
      date: new Date(),
    },
  })
);
