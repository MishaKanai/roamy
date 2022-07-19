import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import LoadingOverlay from 'react-loading-overlay-ts';
import { Dialog } from '@mui/material';
import { useStore } from 'react-redux';
import useFetchCurrentDoc from '../../hooks/useFetchCurrentDoc';
import { SlateDocuments } from '../../../SlateGraph/store/slateDocumentsSlice';
import { DrawingDocuments, replaceDrawings } from '../../../Excalidraw/store/drawingsSlice';
import { DropboxResponseError } from 'dropbox';
import useDbx from '../../hooks/useDbx';
import ResolveConflicts from './ResolveConflicts';
import { mergeTriggeredAction } from '../store/actions';
import attemptMerge from '../util/attemptMerge';
import upload from '../../util/upload';
import { useAppSelector } from '../../../store/hooks';
import { RootState } from '../../../store/configureStore';
import { syncSuccess } from '../../store/activeCollectionSlice';
import { replaceDocs } from '../../../SlateGraph/store/slateDocumentsSlice';

const useAutomerge = () => {
    const _lastRev = useAppSelector(state => state.dbx.collection.state === 'authorized' && state.dbx.collection.rev);
    const lastRevRef = useRef(_lastRev);
    const documents = useAppSelector(state => state.documents);
    const drawings = useAppSelector(state => state.drawings);
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
    const store = useStore<RootState>();
    const submitMergedDoc = useCallback((documents: SlateDocuments, drawings: DrawingDocuments, remoteRev: string) => {
        const state = store.getState();
        const collection = state.dbx.collection;
        const filePath = collection.state === 'authorized' && collection.selectedFilePath
        if (!dbx || !filePath) { return; }
        const docsPendingUpload = new Set<string>();
        Object.values(documents).forEach(doc => {
            const existingDoc = state.documents[doc.name];
            if (!existingDoc || doc.documentHash !== existingDoc.documentHash ||
                doc.backReferencesHash !== existingDoc.backReferencesHash) {
                docsPendingUpload.add(doc.name);
            }
        })
        const drawingsPendingUpload = new Set<string>();
        Object.values(drawings).forEach(drawing => {
            const existingDrawing = state.drawings[drawing.name];
            if (!existingDrawing || drawing.drawingHash !== existingDrawing.drawingHash ||
                drawing.backReferencesHash !== existingDrawing.backReferencesHash) {
                drawingsPendingUpload.add(drawing.name);
            }
        })
        store.dispatch(replaceDocs(documents));
        store.dispatch(replaceDrawings(drawings));

        upload(dbx,
            filePath,
            remoteRev,
            documents,
            drawings,
            collection.revisions,
            docsPendingUpload,
            drawingsPendingUpload
        ).then(({ response, revisions }) => {
            store.dispatch(syncSuccess(response.result.rev, revisions));
        }).catch((error: DropboxResponseError<unknown>) => {
            if (error.status === 409) {
                store.dispatch(mergeTriggeredAction({ documents, drawings }))
            }
        })
    }, [dbx, store])
    return submitMergedDoc;
}


export const MergeEditorWrap: React.FC<{}> = ({ children }) => {
    const mergeState = useAppSelector(state => state.merge)
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
        {/*
            TODO:
            LoadingOverlay calls findDOMNode internally:
            need to figure out how to short-cirucit that through its API,
            or use a different library.
        */}
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