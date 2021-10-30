import React, { useReducer, useMemo } from 'react';
import slateDocumentsReducer, { SlateDocuments } from '../../../SlateGraph/store/reducer';
import { Button, CardActions, CardContent } from '@material-ui/core';
import MergeDocs from './MergeDocs2';
import { useSubmitMergedDoc } from './MergePopup';
import { RootState } from '../../../store/createRootReducer';
import { useSelector } from 'react-redux';
import { combineReducers } from 'redux';
import drawingsReducer, { DrawingDocuments } from '../../../Excalidraw/store/reducer';
import { RootAction, SlateGraphAction } from '../../../store/action';
import trimerge from '../trimerge/trimerge';
import * as slateActions from '../../../SlateGraph/store/actions';

const mergeReducer = combineReducers({
    documents: slateDocumentsReducer,
    drawings: drawingsReducer,
})

type MergeContext = {
    inMergeContext: false
} | {
    inMergeContext: true,
    dispatch: (action: RootAction) => void;
}

export const mergeContext = React.createContext<MergeContext>({ inMergeContext: false });

const ResolveConflicts: React.FC<{
    initial: SlateDocuments;
    left: SlateDocuments;
    right: SlateDocuments;
    remoteRev: string;
}> = ({ left, right, remoteRev, initial }) => {
    const submitMerge = useSubmitMergedDoc();
    const drawings = useSelector((state: RootState) => state.drawings);
    const [initialState, needsManualMerge] = useMemo((): [ReturnType<typeof mergeReducer>, string[]] => {
        
        let initialState: {
            documents: SlateDocuments;
            drawings: DrawingDocuments;
        } = {
            documents: left,
            drawings: drawings // {}
        };
        let needsMerge: string[] = [];

        const applyAction = (action: SlateGraphAction) => {
            initialState.documents = slateDocumentsReducer(initialState.documents, action)
        }
        // add documents from the right that are missing from left and initial
        Object.keys(right).filter(docKey => !initialState.documents[docKey] && !initial[docKey]).forEach((docKey) => {
            applyAction(slateActions.createDocAction(docKey, right[docKey].document))
        })
        // if missing from just left, and not initial, it was deleted, so we can ignore.
        // if missing from initial, and not left, we both added the same doc, and so we should merge it.

        Object.keys(initialState.documents).forEach(docKey => {
            const leftDoc = left[docKey], initialDoc = initial[docKey], rightDoc = right[docKey];
            
            const addNeedsMerge = (docKey: string) => { needsMerge.push(docKey); };
            if (!initialDoc) {
                if (!rightDoc) {
                    // we just added this doc, and so no merge is necessary
                    return;   
                }
                // we both added this doc, and they have different content.
                if (leftDoc.documentHash !== rightDoc.documentHash) {
                    addNeedsMerge(docKey);
                }
                return;
            } else if (!rightDoc) {
                // right side deleted it...
                if (initialDoc.documentHash === leftDoc.documentHash) {
                    // we can delete it since we made no local changes.
                    applyAction(slateActions.deleteDocAction(docKey));
                    return;
                } else {
                    // need to pick keep with changes, or delete;
                    addNeedsMerge(docKey);
                    return;
                }
            } else if (leftDoc.documentHash === rightDoc.documentHash) {
                // no change.
                return;
            } else {
                try {
                    const mergedDoc = trimerge(initialDoc.document, leftDoc.document, rightDoc.document)
                    if (mergedDoc) {
                        applyAction(slateActions.updateDocAction(docKey, mergedDoc, leftDoc.document));
                        return;
                    }
                } catch (e) {
                    // needs manual merge
                    addNeedsMerge(docKey)
                }
            }
        });
        
        return [initialState, needsMerge];
    }, [left, initial, drawings, right])
    const [mergedState, dispatch] = useReducer(mergeReducer, initialState);
    // const [mergedDocuments, setMergedDocuments] = useState<SlateDocuments>(left)
    const providerValue = useMemo(() => ({ inMergeContext: true, dispatch }), [dispatch]);
    return <mergeContext.Provider value={providerValue}>
    <div>
        <CardContent>
            {needsManualMerge.map(docKey => {
                const docLeft = left[docKey];
                const docRight = right[docKey];
                return <div key={docKey}>
                    <MergeDocs
                        curr={mergedState.documents[docKey].document}                
                        docName={docKey}
                        left={docLeft.document}
                        right={docRight.document}
                    />
                </div>;
            })}
        </CardContent>
        <CardActions>
            <Button color="primary" variant="contained" style={{ textTransform: 'capitalize' }} onClick={() => {
                    submitMerge(mergedState.documents, mergedState.drawings, remoteRev)
                }}>
                Submit
            </Button>
        </CardActions>
    </div>
    </mergeContext.Provider>
}
export default ResolveConflicts