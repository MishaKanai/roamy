import { Checkbox, FormControlLabel, useTheme } from '@mui/material';
import React, { useMemo, useCallback, useContext, useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import ToggleButton from '@mui/material/ToggleButton';
import mergeContext from '../mergeContext';
import { DrawingData } from '../../../Excalidraw/store/domain';
import { updateDrawingAction } from '../../../Excalidraw/store/actions';
import DrawingPage from '../../../Excalidraw/Page';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import Draw from '@excalidraw/excalidraw';

const ViewOnlyDrawing: React.FC<{ elements: ExcalidrawElement[], height: any, width: any }> = ({ elements, height, width }) => {
    const initialData = useMemo(() => {
        return {
            elements: elements,
            appState: {
                viewBackgroundColor: "transparent",
            },
        };
    }, [elements]);
    return (
        <div
            style={{
                height,
                width,
            }}
        >
            <Draw
                zenModeEnabled
                viewModeEnabled
                gridModeEnabled
                initialData={initialData}
            />
        </div>
    );
}

interface MergeDrawingsProps {
    drawingName: string
    left: DrawingData;
    right: DrawingData;
    curr: DrawingData;
}
const MergeDrawings: React.FC<MergeDrawingsProps> = ({ left, right, drawingName, curr }) => {
    const mergeCtxt = useContext(mergeContext);
    if (!mergeCtxt.inMergeContext) {
        throw new Error('MergeDrawings outside of ')
    }
    const mrgDispatch = mergeCtxt.dispatch;
    const [leftOrRight, setLeftOrRight] = useState<'left' | 'right'>(curr === left ? 'left' : 'right');

    const [edit, setEdit] = useState(false);
    const handleLeftCheck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            mrgDispatch(updateDrawingAction(drawingName, left));
            if (leftOrRight === 'right' && edit) {
                setEdit(false)
            }

            setLeftOrRight('left');
        }
    }, [mrgDispatch, setLeftOrRight, leftOrRight, drawingName, left, edit])
    const handleRightCheck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            mrgDispatch(updateDrawingAction(drawingName, right));
            if (leftOrRight === 'left' && edit) {
                setEdit(false)
            }
            setLeftOrRight('right');
        }
    }, [mrgDispatch, setLeftOrRight, leftOrRight, drawingName, right, edit])

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
                width: '50%'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={<Checkbox checked={leftSelected} onChange={handleLeftCheck} name="left" />}
                        label="Yours"
                    />
                    {leftSelected ? (
                        <ToggleButton
                            style={{ margin: '2px' }}
                            size="small"
                            value="check"
                            selected={edit}
                            onChange={() => {
                                setEdit(value => !value)
                                if (edit) {
                                    mrgDispatch(updateDrawingAction(drawingName, left))
                                }
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {leftSelected && edit ? (<div>
                    <DrawingPage
                        overrideDrawing={curr}
                        excalidrawProps={{
                            gridModeEnabled: true,
                            zenModeEnabled: true,
                        }}
                        drawingName={drawingName}
                    />
                </div>) : <div style={{ opacity: leftSelected && edit ? 1 : .7, margin: '0px 0.5em 0.5em' }}>
                    <ViewOnlyDrawing height={left.size.height} width={left.size.width} elements={left.elements} />
                </div>}
            </div>
            <div style={{
                ...(rightSelected ? selectedStyles : undefined),
                width: '50%'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={<Checkbox checked={rightSelected} onChange={handleRightCheck} name="right" />}
                        label="Theirs"
                    />
                    {rightSelected ? (
                        <ToggleButton
                            style={{ margin: '2px' }}
                            size="small"
                            value="check"
                            selected={edit}
                            onChange={() => {
                                setEdit(value => !value)
                                if (edit) {
                                    mrgDispatch(updateDrawingAction(drawingName, right))
                                }
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {rightSelected && edit ? (<div>
                    <DrawingPage
                        overrideDrawing={curr}
                        excalidrawProps={{
                            gridModeEnabled: true,
                            zenModeEnabled: true,
                        }}
                        drawingName={drawingName}
                    />
                </div>) : <div style={{ opacity: rightSelected && edit ? 1 : .7, margin: '0px 0.5em 0.5em' }}>
                    <ViewOnlyDrawing height={right.size.height} width={right.size.width} elements={right.elements} />
                </div>}
            </div>
        </div></div>
}
export default MergeDrawings;