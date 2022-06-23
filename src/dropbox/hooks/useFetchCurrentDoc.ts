import { useCallback, useState } from "react"
import { useSelector } from "react-redux"
import { DrawingDocuments } from "../../Excalidraw/store/reducer"
import { SlateDocuments } from "../../SlateGraph/store/reducer"
import { RootState } from "../../store/createRootReducer"
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
        drawings: DrawingDocuments
    }
}
const initial = { type: 'initial' } as const;
const pending = { type: 'pending' } as const;

const useFetchCurrentDoc = () => {
    const dbx = useDbx()
    const [state, setState] = useState<FetchCurrentDocState>(initial)
    const currentFile = useSelector((state: RootState) => state.auth.state === 'authorized' ? state.auth.selectedFilePath : null)
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
                    drawings: data.drawings
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