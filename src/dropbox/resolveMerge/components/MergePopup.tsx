import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import LoadingOverlay from 'react-loading-overlay-ts';
import { Dialog } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../store/createRootReducer';
import useFetchCurrentDoc from '../../hooks/useFetchCurrentDoc';
import { SlateDocuments } from '../../../SlateGraph/store/reducer';
import { DrawingDocuments } from '../../../Excalidraw/store/reducer';
import { replaceDocsAction } from '../../../SlateGraph/store/actions';
import { syncSuccessAction } from '../../store/actions';
import { DropboxResponseError } from 'dropbox';
import useDbx from '../../hooks/useDbx';
import ResolveConflicts from './ResolveConflicts';
import { mergeTriggeredAction } from '../store/actions';
import attemptMerge from '../util/attemptMerge';
import { replaceDrawingsAction } from '../../../Excalidraw/store/actions';

const useAutomerge = () => {
    const _lastRev = useSelector((state: RootState) => state.auth.state === 'authorized' && state.auth.rev)
    const lastRevRef = useRef(_lastRev);
    const documents = useSelector((state: RootState) => state.documents);
    const drawings = useSelector((state: RootState) => state.drawings);
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
        initialDrawings: DrawingDocuments;
        leftDrawings: DrawingDocuments;
        rightDrawings: DrawingDocuments;
    })) | {
        type: 'succeeded',
        mergedDocs: SlateDocuments;
        mergedDrawings: DrawingDocuments;
        remoteRev: string;
    }
    const [autoMergeState, setAutomergeState] = useState<AutomergeState>({ type: 'waiting_for_data' })
    const lastStateTypeRef = useRef(state.type)
    const lastRevStateTypeRef = useRef(lastRevState.type)
    useEffect(() => {
        if (state.type === 'success' && lastRevState.type === 'success' && (
            lastRevStateTypeRef.current !== 'success' || lastStateTypeRef.current !== 'success'
        )) {
            const initialDrawings = lastRevState.data.drawings;
            const leftDrawings = drawings;
            const rightDrawings = state.data.drawings;
            // null means cannot automerge
            const left = documents;
            const right = state.data.documents;
            const initial = lastRevState.data.documents;
           
            const [mergedState, docsNeedingMerge, drawingsNeedingMerge] = attemptMerge({
                documents: {
                    left,
                    right,
                    initial,
                },
                drawings: {
                    left: leftDrawings,
                    right: rightDrawings,
                    initial: initialDrawings,
                }
            })
            if (docsNeedingMerge.length > 0 || drawingsNeedingMerge.length > 0) {
                setAutomergeState({
                    type: 'failed',
                    reason: 'merge_conflict',
                    remoteRev: state.rev,
                    initial,
                    left,
                    right,
                    leftDrawings,
                    rightDrawings,
                    initialDrawings
                })
            } else {
                setAutomergeState({
                    type: 'succeeded',
                    mergedDocs: mergedState.documents,
                    mergedDrawings: mergedState.drawings,
                    remoteRev: state.rev,
                })
            }
        }
        lastStateTypeRef.current = state.type;
        lastRevStateTypeRef.current = lastRevState.type;
    }, [state, lastRevState, setAutomergeState, documents, drawings])

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
        dispatch(replaceDrawingsAction(drawings));
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
    const submitMerge = useSubmitMergedDoc();
    const lastAutoMergeStateType = useRef(autoMergeState.type);
    useEffect(() => {
        if (lastAutoMergeStateType.current !== 'succeeded' && autoMergeState.type === 'succeeded') {
            submitMerge(autoMergeState.mergedDocs, autoMergeState.mergedDrawings, autoMergeState.remoteRev);
        }
        lastAutoMergeStateType.current = autoMergeState.type;
    }, [autoMergeState, submitMerge])

    const displayOverlay = autoMergeState.type === 'waiting_for_data';
    return <>
        {autoMergeState.type === 'failed' ? (
            <Dialog
                fullScreen
                open={true}
            >
                {autoMergeState.reason === 'merge_conflict' ? (
                    <ResolveConflicts
                        remoteRev={autoMergeState.remoteRev}
                        left={autoMergeState.left}
                        right={autoMergeState.right}
                        initial={autoMergeState.initial}
                        leftDrawings={autoMergeState.leftDrawings}
                        rightDrawings={autoMergeState.rightDrawings}
                        initialDrawings={autoMergeState.initialDrawings}
                    />
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