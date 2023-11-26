import { createReducer } from "@reduxjs/toolkit";
import { authSuccess, loggedOut } from "./globalActions";

export type AuthorizedAuthState = {
  state: "authorized";
};
export type DropboxAuthState =
  | {
      state: "not_authorized";
    }
  | AuthorizedAuthState;

const authReducer = createReducer(
  { state: "not_authorized" } as DropboxAuthState,
  (builder) => {
    builder.addCase(authSuccess, () => ({
      state: "authorized",
    }));
    builder.addCase(loggedOut, () => ({
      state: "not_authorized",
    }));
  }
);
export default authReducer;
