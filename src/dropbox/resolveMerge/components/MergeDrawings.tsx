import { Checkbox, FormControlLabel, useTheme } from '@mui/material';
import React, { useMemo, useCallback, useContext, useState } from 'react';
import EditIcon from '@mui/icons-material/Edit';
import ToggleButton from '@mui/material/ToggleButton';
import mergeContext from '../mergeContext';
import { DrawingDataInStore } from '../../../Excalidraw/store/domain';
import { updateDrawing as updateDrawingAction } from '../../../Excalidraw/store/globalActions';
import DrawingPage from '../../../Excalidraw/Page';
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { Excalidraw } from '@excalidraw/excalidraw';
import useExcalidrawInstance from '../../../Excalidraw/hooks/useExcalidrawInstance';
import { UploadedFiles } from '../../../UploadedFiles/uploadedFilesSlice';
import { useFilesSelector } from '../../../Excalidraw/hooks/useFiles';
import convertDrawingInStoreToDispatchedDrawing from '../util/convertDrawingFromStoreRepToDispatchedRep';
import { BinaryFiles } from '@excalidraw/excalidraw/types/types';

const ViewOnlyDrawing: React.FC<{ elements: ExcalidrawElement[], height: any, width: any, files: BinaryFiles }> = ({ elements, height, width, files }) => {
    const { excalidrawRef } = useExcalidrawInstance();
    const initialData = useMemo(() => {
        return {
            elements: elements,
            appState: {
                viewBackgroundColor: "transparent",
            },
            files
        };
    }, [elements, files]);
    
    return (
        <div
            className="roamy-view-excal"
            style={{
                height,
                width,
            }}
        >
            <Excalidraw
                ref={excalidrawRef}
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
    left: DrawingDataInStore;
    right: DrawingDataInStore;
    curr: DrawingDataInStore;
    allFiles: UploadedFiles;

}
const MergeDrawings: React.FC<MergeDrawingsProps> = ({ left, right, drawingName, curr, allFiles }) => {
    const mergeCtxt = useContext(mergeContext);
    if (!mergeCtxt.inMergeContext) {
        throw new Error('MergeDrawings outside of ')
    }
    const mrgDispatch = mergeCtxt.dispatch;
    const [leftOrRight, setLeftOrRight] = useState<'left' | 'right'>(curr === left ? 'left' : 'right');

    const [edit, setEdit] = useState(false);
    const dispatchUpdate = useCallback((drawingData: DrawingDataInStore) => {
        mrgDispatch(updateDrawingAction(drawingName, convertDrawingInStoreToDispatchedDrawing(drawingData)));
    }, [drawingName, mrgDispatch]);
    const handleLeftCheck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            dispatchUpdate(left);
            if (leftOrRight === 'right' && edit) {
                setEdit(false)
            }

            setLeftOrRight('left');
        }
    }, [setLeftOrRight, leftOrRight, left, edit, dispatchUpdate])
    const handleRightCheck = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            dispatchUpdate(right);
            if (leftOrRight === 'left' && edit) {
                setEdit(false)
            }
            setLeftOrRight('right');
        }
    }, [setLeftOrRight, leftOrRight, right, edit, dispatchUpdate])

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
    const filesSelector = useFilesSelector(drawingName);
    const files = filesSelector({
        drawings: {
            [drawingName]: {
                drawing: curr
            }
        },
        uploadedFiles: allFiles
    });
    const currOverrideDrawing = useMemo(() => convertDrawingInStoreToDispatchedDrawing(curr), [curr]);
    
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
                                    dispatchUpdate(left);
                                }
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {leftSelected && edit ? (<div>
                    <DrawingPage
                        overrideFiles={files}
                        overrideDrawing={currOverrideDrawing}
                        excalidrawProps={{
                            gridModeEnabled: true,
                            zenModeEnabled: true,
                        }}
                        drawingName={drawingName}
                    />
                </div>) : <div style={{ opacity: leftSelected && edit ? 1 : .7, margin: '0px 0.5em 0.5em' }}>
                    <ViewOnlyDrawing files={files} height={left.size.height} width={left.size.width} elements={left.elements} />
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
                                    dispatchUpdate(right);
                                }
                            }}
                        >
                            <EditIcon />
                        </ToggleButton>
                    ) : null}
                </div>
                {rightSelected && edit ? (<div>
                    <DrawingPage
                        overrideFiles={files}
                        overrideDrawing={currOverrideDrawing}
                        excalidrawProps={{
                            gridModeEnabled: true,
                            zenModeEnabled: true,
                        }}
                        drawingName={drawingName}
                    />
                </div>) : <div style={{ opacity: rightSelected && edit ? 1 : .7, margin: '0px 0.5em 0.5em' }}>
                    <ViewOnlyDrawing files={files} height={right.size.height} width={right.size.width} elements={right.elements} />
                </div>}
            </div>
        </div></div>
}
export default MergeDrawings;