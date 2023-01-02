import { createContext } from "react";
import { RemoteFilesApi } from "./api";

export const remoteFilesApiContext = createContext<RemoteFilesApi>({
    uploadFile(data) {
        throw new Error('Upload file not provided.')
    },
    downloadFile(data) {
        throw new Error('Download file not provided.')
    },
    deleteFile(id) {
        throw new Error('Delete file not provided.')
    }
})