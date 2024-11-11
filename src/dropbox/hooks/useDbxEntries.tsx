import { useContext, useReducer } from "react";
import { useCallback, useEffect } from "react";
import { selectFilePath as selectFilePathAction } from "../store/globalActions";
import { push as pushAction } from "connected-react-router";
import useDbx from "../hooks/useDbx";
import { fileSelectPendingContext } from "../contexts/fileSelectPending";
import {
  getCollections,
  getCollectionsFailure,
  getCollectionsSuccess,
} from "../collections/actions";
import { Dropbox, DropboxResponseError, files } from "dropbox";
import { IndexFileStructure } from "../domain";
import fetchDataFromCollectionAndCompose from "../util/fetchEntireCollection";
import { II } from "../../Search/util/search";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { replaceDocs } from "../../SlateGraph/store/slateDocumentsSlice";
import { replaceDrawings } from "../../Excalidraw/store/drawingsSlice";
import { replaceFiles } from "../../UploadedFiles/uploadedFilesSlice";
import { replaceRemoteFiles } from "../../RemoteFiles/remoteFilesSlice";
import { replaceCategories } from "../../Category/store/categoriesSlice";
import { decrement, increment } from "../../store/syncGateSlice";

const folderPath = "";

const fetchEntries = (() => {
  let fetches = 0;
  const fetch = (
    dbx: Dropbox,
    onPending: () => void,
    onSuccess: (response: files.ListFolderResult["entries"] | null) => void,
    onError: (error: DropboxResponseError<any>) => void
  ) => {
    if (fetches === 0) {
      onPending();
      fetches = fetches + 1;
      dbx
        .filesListFolder({
          path: folderPath,
          recursive: true, // TODO: fix this. Remove recursive and just get top-level folders
          include_non_downloadable_files: false,
          limit: 3000,
        })
        .then(function (response) {
          const entries = response?.result?.entries?.filter((e) =>
            e.path_lower?.endsWith(".json")
          );
          onSuccess(entries);
        })
        .catch(function (error) {
          onError(error);
        })
        .finally(() => {
          fetches = fetches - 1;
        });
    }
  };
  return fetch;
})();

export const useFetchCollections = (dbx?: Dropbox | null) => {
  const dispatch = useAppDispatch();
  const fetchCollections = useCallback(() => {
    return new Promise<void>((res, rej) => {
      if (!dbx) {
        throw new Error("Dropbox not instantiated");
      }
      fetchEntries(
        dbx,
        () => dispatch(getCollections()),
        (entries) => {
          dispatch(getCollectionsSuccess(entries ?? []));
          res();
        },
        (error) => {
          dispatch(getCollectionsFailure(error));
          rej(error);
        }
      );
    });
  }, [dbx, dispatch]);
  return fetchCollections;
};

/**
 * below is being called multiple times from different components...
 */
const useFetchCollectionsOnMount = (dbx?: Dropbox | null) => {
  const collectionsState = useAppSelector((state) => state.collections);
  const [retryKey, retry] = useReducer((state) => state + 1, 1);
  const fetchCollections = useFetchCollections(dbx);
  useEffect(() => {
    fetchCollections();
  }, [retryKey, fetchCollections]);
  return {
    retry,
    collectionsState,
  };
};

export const useDbxEntries = () => {
  const dispatch = useAppDispatch();
  const dbx = useDbx();
  const { retry, collectionsState } = useFetchCollectionsOnMount(dbx);
  const { setState: setFilePendingState, state: filePendingState } = useContext(
    fileSelectPendingContext
  );

  /*
        call this 'createNewEmptyCollection -
        create a new folder with the collection name, and an 'index.json'
        which contains some data to be figured out.
        
    */
  const createNewEmptyCollection = useCallback(
    (collectionName: string) => {
      const path =
        (collectionName.startsWith("/")
          ? collectionName
          : "/" + collectionName) + "/index.json";
      if (!dbx) {
        return;
      }
      const data: IndexFileStructure = {
        documents: {},
        drawings: {},
        uploadedFiles: [],
      };
      setFilePendingState({ _type: "pending" });
      return dbx
        .filesUpload({
          path,
          contents: new File([JSON.stringify(data, null, 2)], "index.json", {
            type: "application/json",
          }),
          // ...other dropbox args
        })
        .then((response) => {
          II.clear();
          dispatch(pushAction("/"));
          dispatch(
            selectFilePathAction(path, response.result.rev, {
              documents: {},
              drawings: {},
            })
          );
          dispatch(increment());
          dispatch(replaceFiles({}));
          dispatch(replaceDocs({}));
          dispatch(replaceDrawings({}));
          dispatch(replaceRemoteFiles({ remoteFiles: {} }));
          dispatch(decrement());
        })
        .then(() => {
          setFilePendingState({ _type: "ok" });
        })
        .catch((err) => {
          console.error(err);
          setFilePendingState({
            _type: "error",
            message: "an error occurred - check the console.",
          });
        });
    },
    [dbx, setFilePendingState, dispatch]
  );

  const loadExistingCollection = useCallback(
    async (path_lower: string) => {
      const indexFilePath = path_lower;
      if (indexFilePath && dbx) {
        setFilePendingState({ _type: "pending" });
        const setErr = () =>
          setFilePendingState({
            _type: "error",
            fileFailed: indexFilePath,
            message: "error occurred loading file " + indexFilePath,
          });
        try {
          const {
            documents,
            drawings,
            uploadedFiles,
            rev,
            revisions,
            remoteFiles,
            categories,
          } = await fetchDataFromCollectionAndCompose(dbx, indexFilePath);
          II.clear();
          dispatch(increment());
          // we need to prevent the subscription here from running until we've loaded everything.
          dispatch(selectFilePathAction(indexFilePath, rev, revisions));
          dispatch(replaceFiles(uploadedFiles));
          dispatch(replaceDocs(documents));
          dispatch(replaceDrawings(drawings));
          dispatch(replaceCategories(categories ?? {}));
          dispatch(replaceRemoteFiles({ remoteFiles }));
          dispatch(decrement());
          setFilePendingState({ _type: "ok" });
          dispatch(pushAction("/graph"));
        } catch (e) {
          console.error(e);
          setErr();
        }
      }
    },
    [dbx, dispatch, setFilePendingState]
  );

  return {
    collectionsState,
    filePendingState,
    createNewEmptyCollection,
    dbx,
    loadExistingCollection,
    retry,
  };
};

export const useRenameCollection = () => {
  const { dbx, loadExistingCollection } = useDbxEntries();
  const currentCollectionPath = useAppSelector(
    (state) =>
      state.dbx.collection.state === "authorized" &&
      state.dbx.collection.selectedFilePath
  );
  const currentCollectionFolder =
    currentCollectionPath &&
    currentCollectionPath.slice(0, currentCollectionPath.lastIndexOf("/"));
  const fetchCollections = useFetchCollections(dbx);
  const rename = useCallback(
    async (from: string, to: string) => {
      if (!dbx) {
        throw new Error("Dbx not instantiated");
      }
      const from_path = "/" + from;
      const to_path = "/" + to;
      await dbx.filesMoveV2({
        from_path,
        to_path,
      });

      await fetchCollections();

      if (currentCollectionFolder === from_path) {
        loadExistingCollection(to_path + "/index.json");
      }

      // also if the renamed collection is currently open, refetch the collection or at least change that name.
    },
    [dbx, fetchCollections]
  );
  return rename;
};
