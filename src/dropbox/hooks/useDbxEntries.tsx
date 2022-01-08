import { useContext, useReducer } from 'react';
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceDrawingsAction } from "../../Excalidraw/store/actions";
import { DrawingDocuments } from "../../Excalidraw/store/reducer";
import { replaceDocsAction } from "../../SlateGraph/store/actions";
import { SlateDocuments } from "../../SlateGraph/store/reducer";
import { selectFilePathAction } from "../store/actions";
import { push as pushAction } from 'connected-react-router';
import useDbx from '../hooks/useDbx';
import { fileSelectPendingContext } from '../contexts/fileSelectPending';
import { RootState } from '../../store/createRootReducer';
import { getCollections, getCollectionsFailure, getCollectionsSuccess } from '../collections/actions';
import { Dropbox, DropboxResponseError, files } from 'dropbox';
const folderPath = "";

const fetchEntries = (() => {
    let fetches = 0;
    const fetch = (
        dbx: Dropbox,
        onPending: () => void,
        onSuccess: (response: files.ListFolderResult['entries'] | null) => void,
        onError: (error: DropboxResponseError<any>) => void
    ) => {
        if (fetches === 0) {
            onPending();
            fetches = fetches + 1;
            dbx
                .filesListFolder({
                    path: folderPath,
                    recursive: true,
                    include_non_downloadable_files: false,
                })
                .then(function (response) {
                    const entries = response?.result?.entries?.filter((e) =>
                        e.path_lower?.endsWith(".json")
                    );
                    onSuccess(entries)
                })
                .catch(function (error) {
                    onError(error)
                }).finally(() => {
                    fetches = fetches - 1;
                });
        }
    }
    return fetch
})();

export const useFetchCollections = (dbx?: Dropbox | null) => {
    const dispatch = useDispatch();
    const fetchCollections = useCallback(() => {
        if (!dbx) {
            return;
        }
        fetchEntries(
            dbx,
            () => dispatch(getCollections()),
            entries => dispatch(getCollectionsSuccess(entries ?? [])),
            error => dispatch(getCollectionsFailure(error))
        )
    }, [dbx, dispatch]);
    return fetchCollections;
}

const useFetchCollectionsOnMount = (dbx?: Dropbox | null) => {
    const collectionsState = useSelector((state: RootState) => state.collections);
    const [retryKey, retry] = useReducer(state => state + 1, 1);
    const fetchCollections = useFetchCollections(dbx);
    useEffect(() => {
       fetchCollections()
    }, [retryKey, fetchCollections]);
    return {
        retry,
        collectionsState
    }
}

export const useDbxEntries = () => {
    const dispatch = useDispatch();
    const dbx = useDbx()
    const { retry, collectionsState } = useFetchCollectionsOnMount(dbx);
    const { setState: setFilePendingState } = useContext(fileSelectPendingContext);

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
                setFilePendingState({ _type: 'error', message: 'an error occurred - check the console.' })
            });
    }, [dbx, dispatch, setFilePendingState])
    const loadExistingFile = useCallback((path_lower: string) => {
        const fileWeWant = path_lower;
        if (fileWeWant && dbx) {
            setFilePendingState({ _type: 'pending' })
            const setErr = () => setFilePendingState({ _type: 'error', message: 'error occurred loading file ' + fileWeWant });
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
                                dispatch(pushAction('/graph'))
                            }
                        };
                        fr.readAsText(fileBlob);
                        fr.onerror = function (e) {
                            console.error(e)
                            setErr()
                        }
                    }
                }).catch((e) => {
                    setErr()
                });
        }
    }, [dbx, dispatch, setFilePendingState])
    return { collectionsState, dbx, createNewEmptyFile, loadExistingFile, retry };
}
