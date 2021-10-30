import { useCallback, useState } from "react"
import { useSelector } from "react-redux"
import { DrawingDocuments } from "../../Excalidraw/store/reducer"
import { SlateDocuments } from "../../SlateGraph/store/reducer"
import { RootState } from "../../store/createRootReducer"
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
    const fetchCurrentDoc = useCallback((rev?: string) => {
        if (!dbx) {
            throw new Error('no dbx instance');
        }
        if (!currentFile) {
            throw new Error('no current file in store');
        }
        setState(pending)
        dbx
        .filesDownload({ path: currentFile, rev })
        .then(function (data) {
            console.log({ data })
            const rev = data.result.rev;
          const fileBlob = (data.result as any)?.fileBlob;
          if (fileBlob) {
            var fr = new FileReader();
            fr.onload = function (e) {
              // e.target.result should contain the text
              const res = e.target?.result as string;
              if (res) {
                const data: {
                  documents: SlateDocuments;
                  drawings: DrawingDocuments;
                } = JSON.parse(res);
                setState({
                    type:'success',
                    rev,
                    data
                })
              }
            };
            fr.readAsText(fileBlob);
            fr.onerror = function(e) {
              console.error(e)
              console.log('error 1')
              setState({
                  type: 'error',
                  msg: 'an error has occurred'
              })
            }
          }
        }).catch((e) => {
            console.error(e)
            console.log('error 2')
            setState({
                type: 'error',
                msg: 'an error has occurred'
            })
        });
    }, [dbx, setState, currentFile])
    return {
        state,
        fetchCurrentDoc,
        dbx
    } as const
}
export default useFetchCurrentDoc