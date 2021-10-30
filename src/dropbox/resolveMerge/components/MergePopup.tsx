import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import LoadingOverlay from 'react-loading-overlay-ts';
import { Dialog } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/createRootReducer';
import useFetchCurrentDoc from '../../hooks/useFetchCurrentDoc';
import { SlateDocuments } from '../../../SlateGraph/store/reducer';
import { DrawingDocuments } from '../../../Excalidraw/store/reducer';
import trimerge from '../trimerge/trimerge';
import { replaceDocsAction } from '../../../SlateGraph/store/actions';
import { syncSuccessAction } from '../../store/actions';
import { DropboxResponseError } from 'dropbox';
import { addHashesToDocs, removeHashesFromDocs } from '../../../SlateGraph/store/util/hashes';
import useDbx from '../../hooks/useDbx';
import ResolveConflicts from './ResolveConflicts';
import { mergeTriggeredAction } from '../store/actions';

const useAutomerge = () => {
    const _lastRev = useSelector((state: RootState) => state.auth.state === 'authorized' && state.auth.rev)
    const lastRevRef = useRef(_lastRev);
    const documents = useSelector((state: RootState) => state.documents);
    const { state, fetchCurrentDoc } = useFetchCurrentDoc()
    const { state: lastRevState, fetchCurrentDoc: fetchLastRevDoc } = useFetchCurrentDoc();
    useEffect(() => {
        if (!lastRevRef.current) {
            return;
        }
        fetchLastRevDoc(lastRevRef.current)
    }, [fetchLastRevDoc])
    useEffect(() => {
        fetchCurrentDoc()
    }, [fetchCurrentDoc])

    type AutomergeState = {
        type: 'waiting_for_data',
    } | ({
        type: 'failed',
        reason: 'failed_fetch' | 'merge_conflict'
    } & ({
        reason: 'failed_fetch'
    } | {
        reason: 'merge_conflict',
        remoteRev: string;
        initial: SlateDocuments;
        left: SlateDocuments;
        right: SlateDocuments;
        // initial: ReturnType<typeof removeHashesFromDocs>;
        // left: ReturnType<typeof removeHashesFromDocs>;
        // right: ReturnType<typeof removeHashesFromDocs>;
    })) | {
        type: 'succeeded',
        mergedDocs: SlateDocuments;
        remoteRev: string;
    }
    const [autoMergeState, setAutomergeState] = useState<AutomergeState>({ type: 'waiting_for_data' })
    const lastStateTypeRef = useRef(state.type)
    const lastRevStateTypeRef = useRef(lastRevState.type)
    useEffect(() => {
        if (state.type === 'success' && lastRevState.type === 'success' && (
            lastRevStateTypeRef.current !== 'success' || lastStateTypeRef.current !== 'success'
        )) {
            // lets attempt the trimerge.
            let initial = removeHashesFromDocs(lastRevState.data.documents);
            let left = removeHashesFromDocs(documents);
            let right = removeHashesFromDocs(state.data.documents);
            try {
                let mergedDocs = trimerge(initial, left, right);
                mergedDocs = addHashesToDocs(mergedDocs);
                setAutomergeState({ type: 'succeeded', mergedDocs, remoteRev: state.rev })
            } catch (e) {
                setAutomergeState({
                    type: 'failed', reason: 'merge_conflict',
                    remoteRev: state.rev,
                    initial: lastRevState.data.documents, left: documents, right: state.data.documents
                })
            }
        }
        lastStateTypeRef.current = state.type;
        lastRevStateTypeRef.current = lastRevState.type;
    }, [state, lastRevState, setAutomergeState, documents])

    const someFetchError = Boolean(state.type === 'error' || lastRevState.type === 'error');
    useEffect(() => {
        if (someFetchError) {
            setAutomergeState({ type: 'failed', reason: 'failed_fetch' })
        }
    }, [someFetchError, setAutomergeState])
    return autoMergeState
}

export const useSubmitMergedDoc = () => {
    const dbx = useDbx()
    const dispatch = useDispatch()
    const filePath = useSelector((state: RootState) => state.auth.state === 'authorized' && state.auth.selectedFilePath)
    const submitMergedDoc = useCallback((documents: SlateDocuments, drawings: DrawingDocuments, remoteRev: string) => {
        if (!dbx || !filePath) { return; }
        dispatch(replaceDocsAction(documents));
        dbx.filesUpload({
            mode: {
                ".tag": "update",
                update: remoteRev,
            },
            path: filePath,
            contents: new File(
                [
                    JSON.stringify(
                        {
                            documents,
                            drawings,
                        },
                        null,
                        2
                    ),
                ],
                filePath.slice(1),
                {
                    type: "application/json",
                }
            ),
        }).then(response => {
            dispatch(syncSuccessAction(response.result.rev));
        }).catch((error: DropboxResponseError<unknown>) => {
            if (error.status === 409) {
                dispatch(mergeTriggeredAction({ documents, drawings }))
            }
        })
    }, [dbx, dispatch, filePath])
    return submitMergedDoc;
}


export const MergeEditorWrap: React.FC<{}> = ({ children }) => {
    const mergeState = useSelector((state: RootState) => state.merge)
    const [key, refresh] = useReducer((state: number) => state + 1, 1);
    if (mergeState.state === 'conflict') {
        return <MergeWrapper key={key + ':' + mergeState.key} retry={refresh}>{children}</MergeWrapper>
    }
    return <>{children}</>;
}


export const MergeWrapper: React.FC<{ children: React.ReactNode; retry: () => void; }> = ({ children, retry }) => {
    const autoMergeState = useAutomerge()
    const drawings = useSelector((state: RootState) => state.drawings);
    const submitMerge = useSubmitMergedDoc();
    const lastAutoMergeStateRef = useRef(autoMergeState)
    const lastSubmitMergeRef = useRef(submitMerge)
    const lastDrawingsRef = useRef(drawings);
    useEffect(() => {
        if (autoMergeState !== lastAutoMergeStateRef.current) {
            console.log('autoMergeState changed:', lastAutoMergeStateRef.current, autoMergeState)
        }
        if (lastSubmitMergeRef.current !== submitMerge) {
            console.log('submitMerge changed.', lastSubmitMergeRef.current, submitMerge)
        }
        if (drawings !== lastDrawingsRef.current) {
            console.log('drawings changed.', lastDrawingsRef.current, drawings)
        }
        lastAutoMergeStateRef.current = autoMergeState
        lastSubmitMergeRef.current = submitMerge
        lastDrawingsRef.current = drawings;
        if (autoMergeState.type === 'succeeded') {
            submitMerge(autoMergeState.mergedDocs, drawings, autoMergeState.remoteRev);
        }
    }, [autoMergeState, submitMerge, drawings])

    const displayOverlay = autoMergeState.type === 'waiting_for_data';


    return <>
        {autoMergeState.type === 'failed' ? (
            <Dialog
                fullScreen
                open={true}
            >
                {autoMergeState.reason === 'merge_conflict' ? (
                    <ResolveConflicts remoteRev={autoMergeState.remoteRev} left={autoMergeState.left} right={autoMergeState.right} initial={autoMergeState.initial} />
                ) : (
                    <div>Retry?<button onClick={retry}>Retry</button></div>
                )}
            </Dialog>
        ) : null}
        <LoadingOverlay
            active={displayOverlay}
            spinner
            text='Automerging...'
        >
            <div>
                {children}
            </div>
        </LoadingOverlay>
    </>
}


export default MergeEditorWrap;