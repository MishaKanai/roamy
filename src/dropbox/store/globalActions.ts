import { createAction } from "@reduxjs/toolkit";
import { Revisions } from "./activeCollectionSlice";

export const authSuccess = createAction("dropbox/authSuccess", () => {
  return {
    payload: {},
  };
});

export const loggedOut = createAction("dropbox/loggedOut", () => {
  return {
    payload: {},
  };
});

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
