import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { SyncingState } from "./domain";
import { DropboxResponseError } from "dropbox";
import { selectFilePath } from "./globalActions";

export type Revisions = {
  documents: {
    [docName: string]: string;
  };
  drawings: {
    [docName: string]: string;
  };
};
export type AuthorizedCollectionState = {
  state: "authorized";
  selectedFilePath: string;
  rev?: string;
  syncing?: SyncingState;
  revisions?: Revisions;
};
export type CollectionState =
  | {
      state: "not_authorized";
    }
  | AuthorizedCollectionState;

const initialState = { state: "not_authorized" } as CollectionState;

const syncingInitialState = { _type: "initial" } as const;
const syncingDebounceStartState = { _type: "debounced_pending" } as const;
const syncingPendingState = { _type: "request_pending" } as const;

const collectionSlice = createSlice({
  name: "collection",
  initialState,
  reducers: {
    clearCurrentFile(state) {
      if (state.state !== "authorized") {
        return;
      }
      state.selectedFilePath = "";
      state.syncing = syncingInitialState;
    },
    syncDebounceStart(state) {
      if (state.state !== "authorized") {
        return;
      }
      state.syncing = syncingDebounceStartState;
    },
    syncStart(state) {
      if (state.state !== "authorized") {
        return;
      }
      state.syncing = syncingPendingState;
    },
    syncSuccess: {
      reducer(
        state,
        {
          payload,
        }: PayloadAction<{
          rev: string;
          revisions: Revisions;
          date: Date;
        }>
      ) {
        if (state.state !== "authorized") {
          return;
        }
        state.rev = payload.rev;
        state.revisions = payload.revisions;
        state.syncing = { _type: "success", date: payload.date };
      },
      prepare: (rev: string, revisions: Revisions) => ({
        payload: {
          rev,
          revisions,
          date: new Date(),
        },
      }),
    },
    syncFailure: {
      reducer(
        state,
        {
          payload: { date, error },
        }: PayloadAction<{
          error: Pick<DropboxResponseError<unknown>, "error" | "status">;
          date: Date;
        }>
      ) {
        if (state.state !== "authorized") {
          return;
        }
        state.syncing = { _type: "failure", date, error };
      },
      prepare(error: DropboxResponseError<unknown>) {
        const { error: dbxError, status } = error;
        return {
          payload: { error: { error: dbxError, status }, date: new Date() },
        };
      },
    },
  },
  extraReducers(builder) {
    builder
      // instead, we will keep our collection information to recover it after log in
      // .addCase(authSuccess, (state, action) => ({
      //     state: 'authorized',
      //     selectedFilePath: '',
      //     syncing: syncingInitialState
      // }))
      .addCase(
        selectFilePath,
        (
          state,
          { payload: { path: selectedFilePath, rev, revisions, date } }
        ) => ({
          state: "authorized",
          selectedFilePath,
          rev,
          revisions,
          syncing: { _type: "success", date },
        })
      );
  },
});

export const {
  clearCurrentFile,
  syncDebounceStart,
  syncStart,
  syncSuccess,
  syncFailure,
} = collectionSlice.actions;
export default collectionSlice.reducer;
