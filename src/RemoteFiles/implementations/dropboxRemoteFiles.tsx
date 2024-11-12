import { useStore } from "react-redux";
import useDbx from "../../dropbox/hooks/useDbx";
import { RootState } from "../../store/configureStore";
import { RemoteFilesApi } from "../api";
import { v4 as uuidv4 } from "uuid";
import mime from "mime";
import { remoteFilesApiContext } from "../remoteFiles";
import { useMemo, useRef } from "react";
import MurmurHash3 from "imurmurhash";
import { retryWithBackoff } from "../../dropbox/util/retryWithBackoffAndBottleneck";
import { getFileFromDB, storeFileInDB } from "../../IndexedDB/indexedDB";

export const useDropboxRemoteFiles = (): RemoteFilesApi => {
  const dbx = useDbx();
  const store = useStore();
  const getIndexFilePath = () => {
    const collection = (store.getState() as RootState).dbx.collection;
    if (collection.state === "not_authorized") {
      // maybe throw
      return;
    }
    const indexFilePath = collection.selectedFilePath;
    const folderPath =
      indexFilePath.slice(0, indexFilePath.lastIndexOf("/")) + "/";
    return folderPath;
  };
  const downloadedFileHashes = useRef<{ [hash: string]: string }>({});

  return {
    uploadFile: async (data) => {
      const uuid = uuidv4();
      /**
       * TODO:
       * do this for plain file as well.
       * And also recover file if it was recently deleted, instead of reuploading.
       */
      if (data.type === "b64") {
        /**
         * Lets check to see if we are just reuploading a file we have already downloaded-
         * If so, it already exists, and we have its id/filename stored under the hash of its base64 data
         */
        const hashed = MurmurHash3(data.base64).result();
        const found = downloadedFileHashes.current[hashed];
        if (found) {
          try {
            const resp = await dbx?.filesGetMetadata({
              path: found,
            });
            const fileStillExists =
              resp && resp.status >= 200 && resp.status < 300;
            if (fileStillExists) {
              return { id: found.split("/").pop()! };
            }
          } catch (e) {
            // file was deleted - lets reupload by continuing below.
          }
        }
      }
      const filename =
        data.type === "file"
          ? uuid + "--" + data.file.name
          : data.forceFileIdentifier ||
            uuid + "." + mime.getExtension(data.mimeType);
      const response = await dbx?.filesUpload({
        path: getIndexFilePath() + filename,
        contents: data.type === "file" ? data.file : data.base64,
      });

      return {
        id: filename,
      };
    },
    downloadFile: async (filename: string) => {
      const path = getIndexFilePath() + filename;
      if (!dbx) {
        throw new Error("No Dropbox instance");
      }
      // Check if file is already cached in IndexedDB
      const cachedFile = await getFileFromDB(path);
      if (cachedFile) {
        const { data } = cachedFile;
        return { base64: data };
      }

      const data = await retryWithBackoff(() =>
        dbx.filesDownload({
          path,
        })
      );

      const fileBlob = (data?.result as any)?.fileBlob as File;
      if (!fileBlob) {
        throw new Error("No fileBlob");
      }

      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = (e) => {
          const fileData = e.target?.result as string;
          if (fileData) {
            const hashResult = MurmurHash3(fileData).result();
            const dataHash = `${hashResult}`;
            downloadedFileHashes.current[dataHash] = path;
            storeFileInDB(path, fileData);
            resolve({ base64: fileData });
          }
        };
        fr.readAsText(fileBlob);
        fr.onerror = (e) => reject(e);
      });
    },
    deleteFile: async (filename: string) => {
      const path = getIndexFilePath() + filename;
      await dbx?.filesDeleteV2({ path });
      Object.keys(downloadedFileHashes.current).forEach((hash) => {
        if (downloadedFileHashes.current[hash] === path) {
          delete downloadedFileHashes.current[hash];
        }
      });
      return;
    },
    recoverFile: async (filename: string) => {
      const revisions = await dbx?.filesListRevisions({
        path: getIndexFilePath() + filename,
      });
      const entry = revisions?.result?.entries?.[0];
      if (entry && revisions?.result.is_deleted) {
        let result = await dbx?.filesRestore({
          path: getIndexFilePath() + filename,
          rev: entry.rev,
        });
        console.log(result);
      } else {
        throw new Error("failed to recover file");
      }
    },
  };
};

export const DropboxRemoteFilesProvider: React.FC<{}> = (props) => {
  const dbxRemoteFiles = useDropboxRemoteFiles();
  return (
    <remoteFilesApiContext.Provider value={dbxRemoteFiles}>
      {props.children}
    </remoteFilesApiContext.Provider>
  );
};
