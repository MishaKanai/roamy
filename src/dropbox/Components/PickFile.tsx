import React, { useContext } from 'react';
import { files } from "dropbox";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { replaceDrawingsAction } from "../../Excalidraw/store/actions";
import { DrawingDocuments } from "../../Excalidraw/store/reducer";
import { replaceDocsAction } from "../../SlateGraph/store/actions";
import { SlateDocuments } from "../../SlateGraph/store/reducer";
import { selectFilePathAction } from "../store/actions";
import { push as pushAction } from 'connected-react-router';
import useDbx from '../hooks/useDbx';
const folderPath = "";

type FileSelectPendingState = {
  _type: 'ok'
} | {
  _type: 'pending'
} | {
  _type: 'error',
  message: string
}
const ok = { _type: 'ok' } as const;
export const fileSelectPendingContext = React.createContext<{
  state: FileSelectPendingState,
  setState: (state: FileSelectPendingState) => void;
}>({
  state: ok,
  setState: () => null
});
export const FileSelectPendingProvider: React.FC<{}> = props => {
  const [state, setState] = React.useState<FileSelectPendingState>(ok)
  const value = useMemo(() => ({ state, setState }), [state, setState])
  return <fileSelectPendingContext.Provider
    value={value}
  >{props.children}</fileSelectPendingContext.Provider>
}

export const useDbxEntries = () => {
  const [entries, setEntries] =
    useState<files.ListFolderResult["entries"] | null>(null);
  const dbx = useDbx()
  useEffect(() => {
    if (!dbx) {
      return;
    }
    dbx
      .filesListFolder({
        path: folderPath,
        recursive: true,
        include_non_downloadable_files: false,
      })
      .then(function (response) {
        console.log(response);
        const entries = response?.result?.entries?.filter((e) =>
          e.path_lower?.endsWith(".json")
        );
        if (entries) {
          setEntries(entries);
        }
      })
      .catch(function (error) {
        console.log(error);
        // handle retry logic later.
      });
  }, [dbx]);
  const { setState: setFilePendingState } = useContext(fileSelectPendingContext);
  const dispatch = useDispatch();
  const createNewEmptyFile = useCallback((fileName: string) => {
    const path = fileName.startsWith('/') ? fileName : "/" + fileName;
    if (!dbx) {
      return;
    }
    const data = {
      documents: {},
      drawings: {},
    };
    setFilePendingState({ _type: 'pending' })
    return dbx
      .filesUpload({
        path,
        contents: new File([JSON.stringify(data, null, 2)], fileName, {
          type: "application/json",
        }),
        // ...other dropbox args
      })
      .then((response) => {
        console.log(response);
        dispatch(pushAction('/'))
        dispatch(selectFilePathAction(path, response.result.rev));
        dispatch(replaceDocsAction(data.documents));
        dispatch(replaceDrawingsAction(data.drawings));
      })
      .then(() => {
        setFilePendingState({ _type: 'ok' })
      }).catch(err => {
        console.error(err)
        setFilePendingState({ _type: 'error', message: 'an error occurred - check the console.'})
      });
  }, [dbx, dispatch, setFilePendingState])
  const loadExistingFile = useCallback((path_lower: string) => {
    const fileWeWant = path_lower;
    if (fileWeWant && dbx) {
      setFilePendingState({ _type: 'pending' })
      const setErr = () => setFilePendingState({ _type: 'error', message: 'error occurred loading file ' + fileWeWant});
      dbx
        .filesDownload({ path: fileWeWant })
        .then(function (data) {
          const fileBlob = (data.result as any)?.fileBlob;
          if (fileBlob) {
            var fr = new FileReader();
            fr.onload = function (e) {
              // e.target.result should contain the text
              const res = e.target?.result as string;
              if (res) {
                const state: {
                  documents: SlateDocuments;
                  drawings: DrawingDocuments;
                } = JSON.parse(res);

                console.log(state);
                dispatch(
                  selectFilePathAction(
                    fileWeWant,
                    data.result.rev
                  )
                );
                dispatch(replaceDocsAction(state.documents));
                dispatch(replaceDrawingsAction(state.drawings));
                setFilePendingState({ _type: 'ok' })
              }
            };
            fr.readAsText(fileBlob);
            fr.onerror = function(e) {
              console.error(e)
              setErr()
            }
          }
        }).catch((e) => {
          setErr()
        });
    }
  }, [dbx, dispatch, setFilePendingState])
  return { entries, dbx, createNewEmptyFile, loadExistingFile };
}

const PickDbxFile: React.FC<{}> = (props) => {
  const { dbx, entries, loadExistingFile } = useDbxEntries();

  const dispatch = useDispatch();

  return (
    <div>
      <button
        onClick={() => {
          const fileName = "file-name.json";
          const path = "/" + fileName;
          if (!dbx) {
            return;
          }
          const data = {
            documents: {},
            drawings: {},
          };
          dbx
            .filesUpload({
              path, // `/path/to/file-name.json`
              contents: new File([JSON.stringify(data, null, 2)], fileName, {
                type: "application/json",
              }),
              // ...other dropbox args
            })
            .then((response) => {
              console.log(response);
              dispatch(selectFilePathAction(path, response.result.rev));
              dispatch(replaceDocsAction(data.documents));
              dispatch(replaceDrawingsAction(data.drawings));
            }).catch(e =>{
              console.error(e)
            });
        }}
      >
        Create file
      </button>
      <ul>
        {entries?.map((e) => {
          return (
            <li>
              <button
                onClick={() => {
                  e.path_lower && loadExistingFile(e.path_lower)
                }}
              >
                {e.name}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PickDbxFile;
