import * as React from 'react';
import { Tooltip, Typography, useTheme, Zoom } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Button, Dialog, DialogContent, DialogTitle, TextField, DialogActions, Fab } from '@mui/material';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import capitalize from 'lodash/capitalize';
import { useLocation, } from 'react-router';
import { deleteDrawingAction } from '../Excalidraw/store/actions';
import { deleteDocAction } from '../SlateGraph/store/actions';
import { Add } from '@mui/icons-material';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import hash_sum from 'hash-sum';

function DocTypeRadioGroup(props: { onChange: (value: 'doc' | 'drawing') => void; value: 'doc' | 'drawing' }) {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange((event.target as HTMLInputElement).value as 'doc' | 'drawing');
    };

    return (
        <FormControl>
            <FormLabel id="demo-controlled-radio-buttons-group">Type</FormLabel>
            <RadioGroup
                aria-labelledby="demo-controlled-radio-buttons-group"
                name="controlled-radio-buttons-group"
                value={props.value}
                onChange={handleChange}
            >
                <FormControlLabel value="doc" control={<Radio />} label="Document" />
                <FormControlLabel value="drawing" control={<Radio />} label="Drawing" />
            </RadioGroup>
        </FormControl>
    );
}

const CreateDialog: React.FC<{ open: boolean, handleClose: () => void }> = ({ open, handleClose }) => {
    const [docType, setDocType] = React.useState<'doc' | 'drawing'>('doc');
    const [name, setName] = React.useState('');
    const typeDisplayText = docType === 'doc' ? 'concept' : 'drawing';
    const dispatch = useDispatch();
    const placeholderShortId = React.useMemo(() => {
        return hash_sum(Date.now());
    }, [])
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const finalName = name || placeholderShortId;
        dispatch(push(docType === 'doc' ? `/docs/${finalName}` : `/drawings/${finalName}`));
        handleClose()
    };

    return <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
        <form onSubmit={handleSubmit}>
            <DialogTitle id="title">Create a new {typeDisplayText}</DialogTitle>
            <DialogContent>
                <DocTypeRadioGroup value={docType} onChange={setDocType} />
                <TextField
                    placeholder={placeholderShortId}
                    autoFocus
                    margin="dense"
                    id="path_lower"
                    value={name}
                    onChange={event => setName(event.target.value.replace(/\s/g, '-'))}
                    InputLabelProps={{
                        shrink: true
                    }}
                    label={capitalize(typeDisplayText) + ' name'}
                    type="text"
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button type="submit" color="primary">
                    Create
                </Button>
            </DialogActions>
        </form>
    </Dialog>
}

const DeleteDialog: React.FC<{ open: boolean, handleClose: () => void, name: string; docType: 'doc' | 'drawing' }> = ({ open, handleClose, docType, name }) => {
    const typeDisplayText = docType === 'doc' ? 'concept' : 'drawing';
    const dispatch = useDispatch();
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        dispatch(push('/'))
        if (docType === 'drawing') {
            dispatch(deleteDrawingAction(name))
        } else {
            dispatch(deleteDocAction(name))
        }
        handleClose()
    };
    return <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
        <form onSubmit={handleSubmit}>
            <DialogTitle id="title">Delete {typeDisplayText} "{name}"</DialogTitle>
            <DialogContent>
                <Typography>This action cannot be undone.</Typography>
            </DialogContent>
            <DialogActions sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={handleClose} color="primary" variant="contained">
                    Cancel
                </Button>
                <Button type="submit" color="warning">
                    Delete<DeleteIcon sx={{ ml: 1 }} />
                </Button>
            </DialogActions>
        </form>
    </Dialog>
}

const DRAWROUTE = '/drawings/';
const DOCROUTE = '/docs/'
const CreateFab = React.memo(() => {
    const [open, setOpen] = React.useState<'delete' | 'create' | 'none'>('none');
    const { pathname } = useLocation()
    const onDrawingPage = pathname?.includes(DRAWROUTE)
    const onDocsPage = pathname?.includes(DOCROUTE)
    const name = React.useMemo(() => {
        if (onDrawingPage) {
            return pathname.slice(DRAWROUTE.length)
        }
        if (onDocsPage) {
            return pathname.slice(DOCROUTE.length)
        }
    }, [onDrawingPage, onDocsPage, pathname])
    const theme = useTheme();
    const transitionDuration = {
        enter: theme.transitions.duration.enteringScreen,
        exit: theme.transitions.duration.leavingScreen,
    };
    const showDelete = Boolean((onDrawingPage || onDocsPage) && name);
    return (
        <>
            {open === 'create' ? (<CreateDialog
                open
                handleClose={() => setOpen('none')}
            />) : open === 'delete' && name ? (
                <DeleteDialog
                    open
                    name={name}
                    docType={onDrawingPage ? 'drawing' : 'doc'}
                    handleClose={() => setOpen('none')}
                />
            ) : null}
            <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', margin: '-5px 0', zIndex: 9999999999 }}>
                <div style={{ margin: '5px 0' }}>
                    <Zoom
                        in={showDelete}
                        timeout={transitionDuration}
                        style={{
                            transitionDelay: `${showDelete ? transitionDuration.exit : 0}ms`,
                        }}
                        unmountOnExit
                    >
                        <Tooltip title="Delete" placement='left'>
                            <Fab
                                onClick={() => setOpen('delete')}
                                sx={{ opacity: .4, backgroundColor: theme.palette.warning.main, color: theme.palette.getContrastText(theme.palette.warning.main) }}
                            >
                                <DeleteIcon />
                            </Fab>
                        </Tooltip>
                    </Zoom>
                </div>
                <div style={{ margin: '5px 0' }}>
                    <Tooltip title="Create" placement='left'>
                        <Fab
                            sx={{ opacity: .4 }}
                            onClick={() => setOpen('create')}
                            color="secondary"
                            aria-label="Create"
                        ><Add /></Fab>
                    </Tooltip>
                </div>
            </div>
        </>
    );
})
export default CreateFab;
