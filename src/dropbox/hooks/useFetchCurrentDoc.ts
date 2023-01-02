import { useCallback, useState } from "react"
import { DrawingDocuments } from "../../Excalidraw/store/drawingsSlice"
import { RemoteFiles } from "../../RemoteFiles/remoteFilesSlice"
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice"
import { useAppSelector } from "../../store/hooks"
import { UploadedFiles } from "../../UploadedFiles/uploadedFilesSlice"
import fetchDataFromCollectionAndCompose from "../util/fetchEntireCollection"
import useDbx from "./useDbx"

export type FetchCurrentDocState = {
    type: 'initial',
} | {
    type: 'pending'
} | {
    type: 'error',
    msg: string
} | {
    type: 'success',
    rev: string;
    data: {
        documents: SlateDocuments,
        drawings: DrawingDocuments,
        uploadedFiles: UploadedFiles,
        remoteFiles: RemoteFiles,
    }
}
const initial = { type: 'initial' } as const;
const pending = { type: 'pending' } as const;

const useFetchCurrentDoc = () => {
    const dbx = useDbx()
    const [state, setState] = useState<FetchCurrentDocState>(initial)
    const currentFile = useAppSelector(state => state.dbx.collection.state === 'authorized' ? state.dbx.collection.selectedFilePath : null)
    const fetchCurrentDoc = useCallback(async (rev?: string) => {
        if (!dbx) {
            throw new Error('no dbx instance');
        }
        if (!currentFile) {
            throw new Error('no current file in store');
        }
        setState(pending)

        try {
            const data = await fetchDataFromCollectionAndCompose(dbx, currentFile, rev);
            setState({
                type: 'success',
                rev: data.rev,
                data: {
                    documents: data.documents,
                    drawings: data.drawings,
                    uploadedFiles: data.uploadedFiles,
                    remoteFiles: data.remoteFiles
                }
            })
        } catch (e) {
            console.error(e)
            setState({
                type: 'error',
                msg: 'an error has occurred'
            })
        }
    }, [dbx, setState, currentFile])
    return {
        state,
        fetchCurrentDoc,
        dbx
    } as const
}
export default useFetchCurrentDoc