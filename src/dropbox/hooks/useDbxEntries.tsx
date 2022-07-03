import { useContext, useReducer } from 'react';
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { replaceDrawingsAction } from "../../Excalidraw/store/actions";
import { replaceDocsAction } from "../../SlateGraph/store/actions";
import { selectFilePathAction } from "../store/actions";
import { push as pushAction } from 'connected-react-router';
import useDbx from '../hooks/useDbx';
import { fileSelectPendingContext } from '../contexts/fileSelectPending';
import { RootState } from '../../store/createRootReducer';
import { getCollections, getCollectionsFailure, getCollectionsSuccess } from '../collections/actions';
import { Dropbox, DropboxResponseError, files } from 'dropbox';
import { IndexFileStructure } from '../domain';
import fetchDataFromCollectionAndCompose from '../util/fetchEntireCollection';
import { II } from '../../Search/util/search';

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

    /*
        call this 'createNewEmptyCollection -
        create a new folder with the collection name, and an 'index.json'
        which contains some data to be figured out.
        
    */
    const createNewEmptyCollection = useCallback((collectionName: string) => {
        const path = (collectionName.startsWith('/') ? collectionName : "/" + collectionName) + '/index.json';
        if (!dbx) {
            return;
        }
        const data: IndexFileStructure = {
            documents: {},
            drawings: {},
        };
        setFilePendingState({ _type: 'pending' })
        return dbx
            .filesUpload({
                path,
                contents: new File([JSON.stringify(data, null, 2)], 'index.json', {
                    type: "application/json",
                }),
                // ...other dropbox args
            })
            .then((response) => {
                II.clear();
                dispatch(pushAction('/'))
                dispatch(selectFilePathAction(path, response.result.rev, { documents: {}, drawings: {}}));
                dispatch(replaceDocsAction({}));
                dispatch(replaceDrawingsAction({}));
            })
            .then(() => {
                setFilePendingState({ _type: 'ok' })
            }).catch(err => {
                console.error(err)
                setFilePendingState({ _type: 'error', message: 'an error occurred - check the console.' })
            });
    }, [dbx, setFilePendingState, dispatch])

    const loadExistingCollection = useCallback(async (path_lower: string) => {
        const indexFilePath = path_lower;
        if (indexFilePath && dbx) {
            setFilePendingState({ _type: 'pending' })
            const setErr = () => setFilePendingState({ _type: 'error', message: 'error occurred loading file ' + indexFilePath });
            try {
                const { documents, drawings, rev, revisions } = await fetchDataFromCollectionAndCompose(dbx, indexFilePath);
                II.clear();
                dispatch(
                    selectFilePathAction(
                        indexFilePath,
                        rev,
                        revisions
                    )
                );
                dispatch(replaceDocsAction(documents));
                dispatch(replaceDrawingsAction(drawings));
                setFilePendingState({ _type: 'ok' })
                dispatch(pushAction('/graph'))
            } catch (e) {
                setErr();
            }
        }
    }, [dbx, dispatch, setFilePendingState])

    return {
        collectionsState,
        createNewEmptyCollection,
        dbx,
        loadExistingCollection,
        retry
    };
}

