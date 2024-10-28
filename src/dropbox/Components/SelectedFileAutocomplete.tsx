/* eslint-disable no-use-before-define */
import React, { useEffect, useMemo } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import { files } from "dropbox";
import { useDbxEntries } from "../hooks/useDbxEntries";
import CreateCollectionDialog from "./CreateCollectionDialog";
import { push as pushAction } from "connected-react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

const filter = createFilterOptions<DropboxFileOptionType>();

export const getDisplayTextFromIndexFilePath = (path_lower: string) =>
  path_lower.slice(1, path_lower.lastIndexOf("/index.json"));

export default function SelectedFileAutocomplete() {
  const currentFilePath = useAppSelector((state) =>
    state.dbx.collection.state === "authorized"
      ? state.dbx.collection.selectedFilePath
      : null
  );
  const { collectionsState, loadExistingCollection } = useDbxEntries();
  const dbxEntries: DropboxFileOptionType[] = React.useMemo(() => {
    const entries =
      collectionsState._tag === "success"
        ? collectionsState.data
        : collectionsState._tag === "pending"
        ? collectionsState.prevData ?? null
        : null;

    return (
      entries?.flatMap((entry) =>
        entry[".tag"] === "file" &&
        entry.path_lower &&
        new RegExp("\\/.*\\/index\\.json").test(entry.path_lower)
          ? [
              {
                path_lower: entry.path_lower,
                title: getDisplayTextFromIndexFilePath(entry.path_lower),
              },
            ]
          : []
      ) ?? []
    );
  }, [collectionsState]);
  const initialValue = useMemo(
    () =>
      currentFilePath
        ? {
            path_lower: currentFilePath,
            title: getDisplayTextFromIndexFilePath(currentFilePath),
          }
        : null,
    [currentFilePath]
  );
  const [value, setValue] = React.useState<DropboxFileOptionType | null>(
    initialValue
  );
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  const dispatch = useAppDispatch();
  return (
    <CreateCollectionDialog
      key={currentFilePath ?? "none"}
      onCreate={(collectionName) => {
        setValue({
          title: collectionName,
          path_lower: "/" + collectionName + "/index.json",
        });
        dispatch(pushAction("/graph"));
      }}
    >
      {({ promptCreate }) => (
        <Autocomplete
          value={value}
          onBlur={() => {
            if (!value) {
              setValue(initialValue);
            }
          }}
          onChange={(event, newValue) => {
            if (typeof newValue === "string") {
              const existing = dbxEntries?.find((e) => e.title === newValue);
              if (existing && existing.path_lower) {
                setValue(existing);
                loadExistingCollection(existing.path_lower);
              } else {
                promptCreate(newValue);
              }
              return;
            }
            if (
              newValue &&
              newValue.inputValue &&
              newValue.title?.startsWith('Add "')
            ) {
              promptCreate(newValue.inputValue);
            } else if (newValue) {
              newValue.path_lower &&
                loadExistingCollection(newValue.path_lower);
              setValue(newValue);
            }
          }}
          filterOptions={(options, params) => {
            const filtered = filter(options, params) as DropboxFileOptionType[];

            if (params.inputValue !== "") {
              if (
                !filtered.some((e) => e.title?.startsWith(params.inputValue))
              ) {
                filtered.push({
                  inputValue: params.inputValue,
                  title: `Add "${params.inputValue}"`,
                });
              }
            }
            return filtered;
          }}
          options={dbxEntries}
          getOptionLabel={(option) => {
            // e.g value selected with enter, right from the input
            if (typeof option === "string") {
              return option;
            }
            if (option.inputValue) {
              return option.inputValue;
            }
            return option.title;
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          // renderOption={(option) => option.title}
          renderOption={(props, option, { selected }) => (
            <li {...props}>{option.title}</li>
          )}
          // style={{ minWidth: 'min(256px, calc(100vw - 70px))' }}
          fullWidth
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              label="Collection"
              variant="outlined"
            />
          )}
        />
      )}
    </CreateCollectionDialog>
  );
}

interface DropboxFileOptionType
  extends Pick<files.FileMetadataReference, "path_lower"> {
  inputValue?: string;
  title: string;
}
