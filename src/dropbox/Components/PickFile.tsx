import { Dropbox, files } from "dropbox";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceDrawingsAction } from "../../Excalidraw/store/actions";
import { DrawingDocuments } from "../../Excalidraw/store/reducer";
import { replaceDocsAction } from "../../SlateGraph/store/actions";
import { SlateDocuments } from "../../SlateGraph/store/reducer";
import { RootState } from "../../store/createRootReducer";
import { selectFilePathAction } from "../store/actions";

const folderPath = "";

const PickDbxFile: React.FC<{}> = (props) => {
  const [entries, setEntries] =
    useState<files.ListFolderResult["entries"] | null>(null);
  const accessToken = useSelector(
    (state: RootState) =>
      state.auth.state === "authorized" && state.auth.accessToken
  );
  const dbx = useMemo(() => {
    return accessToken && new Dropbox({ accessToken });
  }, [accessToken]);
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
                  const fileWeWant = e.path_lower;
                  if (fileWeWant && dbx) {
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
                            }
                          };
                          fr.readAsText(fileBlob);
                        }
                      });
                  }
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
