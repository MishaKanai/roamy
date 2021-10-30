import { Checkbox, FormControlLabel, useTheme } from '@material-ui/core';
import React, { useCallback, useContext, useState } from 'react';
import ReadOnlyDoc from '../../../Autocomplete/Editor/ReadOnly';
import Page from '../../../SlateGraph/Page';
import { SlateNode } from '../../../SlateGraph/store/domain';
import EditIcon from '@material-ui/icons/Edit';
import ToggleButton from '@material-ui/lab/ToggleButton';
import { mergeContext } from './ResolveConflicts2';
import { updateDocAction } from '../../../SlateGraph/store/actions';

interface MergeDocsProps {
    docName: string
    left: SlateNode[];
    right: SlateNode[];
    curr: SlateNode[];
}
const MergeDocs: React.FC<MergeDocsProps> = ({ left, right, docName, curr }) => {
    const mergeCtxt = useContext(mergeContext);
    if (!mergeCtxt.inMergeContext) {
        throw new Error('MergeDocs outside of ')
    }
    const mrgDispatch = mergeCtxt.dispatch;
    const [leftOrRight, setLeftOrRight] = useState<'left' | 'right'>(curr === left ? 'left' : 'right');

    const [edit, setEdit] = useState(false);
    const handleLeftCheck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.checked) {
                mrgDispatch(updateDocAction(docName, left, curr));
                if (leftOrRight === 'right' && edit) {
                    setEdit(false)
                }
                
                setLeftOrRight('left');
            }
    }, [mrgDispatch, setLeftOrRight, leftOrRight, docName, left, curr, edit])
    const handleRightCheck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            mrgDispatch(updateDocAction(docName, right, curr));
            if (leftOrRight === 'left' && edit) {
                setEdit(false)
            }
            setLeftOrRight('right');
        }
    }, [mrgDispatch, setLeftOrRight, leftOrRight, docName, right, curr, edit])

    // const createChildDoc = useCreateChildDoc(docName);
    const leftSelected = leftOrRight === 'left';
    const rightSelected = leftOrRight === 'right';
    const theme = useTheme();
    const selColor = theme.palette.primary.main;
    const selectedStyles = {
        outline: 'none',
        border: '2px solid ' + selColor,
        borderRadius: '4px',
        borderColor: selColor,
        boxShadow: '0 0 10px ' + selColor
    };
    return <div>
        <div style={{ display: 'flex' }}>
            <div style={{ 
                ...(leftSelected ? selectedStyles : undefined),
                width:'50%'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={<Checkbox checked={leftSelected} onChange={handleLeftCheck} name="left" />}
                        label="Yours"
                    />
                    {leftSelected ? (
                        <ToggleButton
                            style={{margin: '2px'}}
                            size="small"
                            value="check"
                            selected={edit}
                            onChange={() => {
                                setEdit(value => !value)
                                if (edit) {
                                    mrgDispatch(updateDocAction(docName, left, curr))
                                }
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {leftSelected && edit ? (<div>
                    <Page
                        currDoc={curr}
                        docName={docName}
                    />
                </div>) : <div style={{ opacity: leftSelected && edit ? 1 : .7, margin: '0px 0.5em 0.5em' }}><ReadOnlyDoc docName={docName} document={leftSelected ? curr : left} /></div>}
            </div>
            <div style={{
                ...(rightSelected ? selectedStyles : undefined),
                width:'50%'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={<Checkbox checked={rightSelected} onChange={handleRightCheck} name="right" />}
                        label="Theirs"
                    />
                    {rightSelected ? (
                        <ToggleButton
                            style={{margin: '2px'}}
                            size="small"
                            value="check"
                            selected={edit}
                            onChange={() => {
                                setEdit(value => !value)
                                if (edit) {
                                    mrgDispatch(updateDocAction(docName, right, curr))
                                }
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {rightSelected && edit ? (<div>
                    <Page
                        currDoc={curr}
                        docName={docName}
                    />
                </div>) : <div style={{ opacity: rightSelected && edit ? 1 : .7, margin: '0px 0.5em 0.5em' }}><ReadOnlyDoc docName={docName} document={rightSelected ? curr : right} /></div>}
            </div>
        </div></div>
}
export default MergeDocs;