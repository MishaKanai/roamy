import { useStore } from "react-redux";
import useDbx from "../../dropbox/hooks/useDbx";
import { RootState } from "../../store/configureStore";
import { RemoteFilesApi } from "../api";
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime';
import { remoteFilesApiContext } from "../remoteFiles";
import { useRef } from "react";
import MurmurHash3 from "imurmurhash";

export const useDropboxRemoteFiles = (): RemoteFilesApi => {
    const dbx = useDbx();
    const store = useStore();
    const getIndexFilePath = () => {
        const collection =(store.getState() as RootState).dbx.collection;
        if (collection.state === 'not_authorized') {
            // maybe throw
            return;
        }
        const indexFilePath = collection.selectedFilePath;
        const folderPath = indexFilePath.slice(0, indexFilePath.lastIndexOf('/')) + '/';
        return folderPath;
    }
    const downloadedFileHashes = useRef<{ [hash: string]: string }>({});
    return {
        uploadFile: async (data) => {
            const uuid = uuidv4();
            /**
             * TODO:
             * do this for plain file as well.
             * And also recover file if it was recently deleted, instead of reuploading.
             */
            if (data.type === 'b64') {
                /**
                 * Lets check to see if we are just reuploading a file we have already downloaded-
                 * If so, it already exists, and we have its id/filename stored under the hash of its base64 data
                 */
                const hashed = MurmurHash3(data.base64).result()
                const found = downloadedFileHashes.current[hashed];
                if (found) {
                    try {
                        const resp = await dbx?.filesGetMetadata({ path: getIndexFilePath() + found })
                        const fileStillExists = resp && resp.status >= 200 && resp.status < 300;
                        if (fileStillExists) {
                            return { id: found }
                        }
                    } catch (e) {
                        // file was deleted - lets reupload by continuing below.
                    }
                }
            }
            const filename = data.type === 'file' ? uuid + '--' + data.file.name : uuid + '.' + mime.getExtension(data.mimeType);
            const response = await dbx?.filesUpload({ path: getIndexFilePath() + filename, contents: data.type === 'file' ? data.file : data.base64 })
            console.log({
                response
            })
            return {
                id: filename
            };
        },
        downloadFile: async (filename: string) => {
            const data = await dbx?.filesDownload({ path: getIndexFilePath() + filename });
            const fileBlob = (data?.result as any)?.fileBlob as File;
            if (!fileBlob) {
                throw new Error('No fileBlob');
            }
            return new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = function (e) {
                    // e.target.result should contain the text
                    const data = e.target?.result as string;
                    if (data) {
                        console.log({
                            fileBlob
                        })
                        const hashResult = MurmurHash3(data).result();
                        const dataHash = `${hashResult}`;
                        downloadedFileHashes.current[dataHash] = filename;
                        resolve({
                            base64: data,
                        });
                    }
                };
                fr.readAsText(fileBlob);
                fr.onerror = function (e) {
                    reject(e);
                }
            });
        },
        deleteFile: async (filename: string) => {
            await dbx?.filesDeleteV2({ path: getIndexFilePath() + filename })
            Object.keys(downloadedFileHashes.current).forEach(hash => {
                if (downloadedFileHashes.current[hash] === filename) {
                    delete downloadedFileHashes.current[hash];
                }
            })
            return;
        },
        recoverFile: async (filename: string) => {
            const revisions = await dbx?.filesListRevisions({ path: getIndexFilePath() + filename })
            const entry = revisions?.result?.entries?.[0];
            if (entry && revisions?.result.is_deleted) {
                let result = await dbx?.filesRestore({ path: getIndexFilePath() + filename, rev: entry.rev })
                console.log(result);
            } else {
                throw new Error('failed to recover file')
            }
        }
    }
}

export const DropboxRemoteFilesProvider: React.FC<{}> = props => {
    const dbxRemoteFiles = useDropboxRemoteFiles();
    return <remoteFilesApiContext.Provider value={dbxRemoteFiles}>
        {props.children}
    </remoteFilesApiContext.Provider>
}