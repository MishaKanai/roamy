import { Edit } from '@mui/icons-material';
import { Button, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material';
import React from 'react';
import { useDispatch } from 'react-redux';
import Popup from './Popup';
import { useAppSelector } from '../store/hooks';
import { setTitle } from '../SlateGraph/store/slateDocumentsSlice';
import { setDrawingTitle } from '../Excalidraw/store/drawingsSlice';

const EditTitleForm = ({
    initialTitle,
    onSubmit,
    docName,
    onCancel
}: {
    onCancel?: () => void;
    docName?: string;
    initialTitle?: string;
    onSubmit: (data: {
        title: string;
    }) => void;
}) => {
    const [title, setTitle] = React.useState(initialTitle ?? '');
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit({ title });
    };
    return <form onSubmit={handleSubmit}>
        <DialogContent>
        <TextField
            placeholder={docName}
            autoFocus
            margin="dense"
            id="path_lower"
            value={title}
            onChange={event => setTitle(event.target.value)}
            InputLabelProps={{
                shrink: true
            }}
            label="Document Title"
            type="text"
        />
        </DialogContent>
        <DialogActions>
            {onCancel ? <Button onClick={onCancel} color="primary">
                    Cancel
                </Button> : null}
            <Button type="submit" color="primary">
                Submit
            </Button>
        </DialogActions>
    </form>
}

const useDisplayTitle = (id: string, type: 'documents' | 'drawings') => {
    return useAppSelector(state => state[type][id]?.displayName);
}

const EditableTitle = ({ id, type }: { id: string, type: 'documents' | 'drawings' }) => {
    const displayTitle = useDisplayTitle(id, type);
    const dispatch = useDispatch();
    const [hovered, setHovered] = React.useState(false);
    return <span onMouseLeave={() => setHovered(false)} onMouseEnter={() => setHovered(true)}>
        {displayTitle ?? <span style={{ opacity: '.5' }}>{id}</span>}
        <Popup
            ComponentProps={{
                'aria-labelledby': 'rename-title-dialog'
            }}
            onClose={() => setHovered(false)}
            renderDialogContent={({ closeDialog }) => {
                return <>
                    <DialogTitle id='rename-title-dialog'>Rename {type === 'documents' ? 'Document' : 'Drawing'}</DialogTitle>
                    <EditTitleForm
                        docName={id}
                        initialTitle={displayTitle}
                        onCancel={closeDialog}
                        onSubmit={({ title }) => {
                            const action = type === 'documents' ? setTitle({ name: id, displayName: title }) :
                                setDrawingTitle({ name: id, displayName: title });
                            dispatch(action);
                            closeDialog();
                        }}
                    />
                </>
            }}
            renderToggler={({ openDialog }) => {
                return <IconButton
                    color="primary"
                    onClick={() => {
                        openDialog()()
                    }}
                    style={!hovered ? { visibility: 'hidden' } : undefined}
                    onFocus={() => setHovered(true)}
                    size="small"
                >
                    <Edit fontSize="small" />
                </IconButton>
            }}
        />
    </span>
}

const DocTitle = ({ id, editable, type }: { type: 'documents' | 'drawings', id: string; editable?: boolean }) => {
    const displayTitle = useDisplayTitle(id, type);
    if (editable) {
        return <EditableTitle type={type} id={id} />
    }
    if (!displayTitle) {
        return <span style={{ opacity: '.5' }}>{id}</span>
    }
    return <>{displayTitle ?? id}</>
}

export default DocTitle;

// TODO: genericize to be used with drawings as well.