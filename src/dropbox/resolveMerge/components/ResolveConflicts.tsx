import React, { useState } from 'react';
import uniq from 'lodash/uniq'
import { SlateDocuments } from '../../../SlateGraph/store/reducer';
import { Button, Card, CardActions, CardContent } from '@material-ui/core';
import MergeDocs from './MergeDocs';
import hashSum from 'hash-sum';
import { useSubmitMergedDoc } from './MergePopup';
import { RootState } from '../../../store/createRootReducer';
import { useSelector } from 'react-redux';

const ResolveConflicts: React.FC<{
    initial: SlateDocuments;
    left: SlateDocuments;
    right: SlateDocuments;
    remoteRev: string;
}> = ({ left, right, remoteRev }) => {
    const submitMerge = useSubmitMergedDoc();
    const drawings = useSelector((state: RootState) => state.drawings);
    const [mergedDocuments, setMergedDocuments] = useState<SlateDocuments>(left)
    return <Card>
        <CardContent>
            {Object.values(uniq([...Object.keys(left), ...Object.keys(right)])).filter(docKey => {
                const docLeft = left[docKey];
                const docRight = right[docKey];
                return docLeft.documentHash !== docRight.documentHash
            }).map(docKey => {
                const docLeft = left[docKey];
                const docRight = right[docKey];
                return <div key={docKey}>
                    <MergeDocs
                        curr={mergedDocuments[docKey].document}
                        onChange={nodes => {
                            setMergedDocuments(documents => ({
                                ...documents,
                                [docKey]: {
                                    ...documents[docKey],
                                    document: nodes,
                                    documentHash: hashSum(document)
                                }
                            }))
                        }}
                        docName={docKey}
                        left={docLeft.document}
                        right={docRight.document}
                    />
                </div>;
            })}
        </CardContent>
        <CardActions>
            <Button color="primary" variant="contained" style={{ textTransform: 'capitalize' }} onClick={() => {
                    submitMerge(mergedDocuments, drawings, remoteRev)
                }}>
                Submit
            </Button>
        </CardActions>
    </Card>
}
export default ResolveConflicts