import { Checkbox, FormControlLabel } from '@material-ui/core';
import React, { useState } from 'react';
import ReadOnlyDoc from '../../../Autocomplete/Editor/ReadOnly';
import SlateGraphEditor from '../../../SlateGraph/Editor';
import { useCreateChildDoc } from '../../../SlateGraph/Page';
import { SlateNode } from '../../../SlateGraph/store/domain';
import EditIcon from '@material-ui/icons/Edit';
import ToggleButton from '@material-ui/lab/ToggleButton';

interface MergeDocsProps {
    docName: string
    left: SlateNode[];
    right: SlateNode[];
    curr: SlateNode[];
    onChange: (nodes: SlateNode[]) => void;
}
const MergeDocs: React.FC<MergeDocsProps> = ({ left, right, docName, curr, onChange }) => {
    const [leftOrRight, setLeftOrRight] = useState<'left' | 'right'>(curr === left ? 'left' : 'right');
    const [edit, setEdit] = useState(false);
    const createChildDoc = useCreateChildDoc(docName);
    const leftSelected = leftOrRight === 'left';
    const rightSelected = leftOrRight === 'right';
    return <div>
        <div style={{ display: 'flex' }}>
            <div style={{ border: leftSelected ? '1px solid grey' : undefined, padding: '3px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={<Checkbox checked={leftSelected} onChange={e => {
                            if (e.target.checked) {
                                setLeftOrRight('left')
                                onChange(left)
                            }
                        }} name="left" />}
                        label="Yours"
                    />
                    {leftSelected ? (
                        <ToggleButton
                            size="small"
                            value="check"
                            selected={edit}
                            onChange={() => {
                                setEdit(value => !value)
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {leftSelected && edit ? (<div>
                    <SlateGraphEditor
                        title={docName}
                        createDoc={createChildDoc}
                        value={curr}
                        setValue={onChange}
                        docName={docName}
                    />
                </div>) : <div style={{ opacity: leftSelected ? 1 : .8 }}><ReadOnlyDoc docName={docName} document={left} /></div>}
            </div>
            <div style={{ width: '3px' }}></div>
            <div style={{ border: rightSelected ? '1px solid grey' : undefined, padding: '3px', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={<Checkbox checked={rightSelected} onChange={e => {
                            if (e.target.checked) {
                                setLeftOrRight('right')
                                onChange(right)
                            }
                        }} name="right" />}
                        label="Theirs"
                    />
                    {rightSelected ? (
                        <ToggleButton
                            size="small"
                            value="check"
                            selected={edit}
                            onChange={() => {
                                setEdit(value => !value)
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {rightSelected && edit ? (<div>
                    <SlateGraphEditor
                        title={docName}
                        createDoc={createChildDoc}
                        value={curr}
                        setValue={onChange}
                        docName={docName}
                    />
                </div>) : <div style={{ opacity: rightSelected ? 1 : .8 }}><ReadOnlyDoc docName={docName} document={right} /></div>}
            </div>
        </div></div>
}
export default MergeDocs;