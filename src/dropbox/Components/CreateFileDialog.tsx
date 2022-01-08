/* eslint-disable no-use-before-define */
import React from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useDbxEntries } from '../hooks/useDbxEntries';


interface CreateCollectionDialogProps {
    onCreate?: (filename: string) => void;
    children: (props: { promptCreate: (filename?: string) => void; }) => JSX.Element;
}
export default function CreateCollectionDialog({ onCreate, children }: CreateCollectionDialogProps) {
    const { createNewEmptyFile } = useDbxEntries();
    const [open, toggleOpen] = React.useState(false);

    const handleClose = () => {
        setDialogValue({
            path_lower: ''
        });
        toggleOpen(false);
    };

    const [dialogValue, setDialogValue] = React.useState({
        path_lower: '',
    });

    // called from dialog
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { path_lower } = dialogValue;
        const fileString = path_lower.endsWith('.json') ? path_lower : path_lower + '.json';
        createNewEmptyFile(fileString)?.then(cnf => {
            onCreate?.(fileString);
            handleClose();
        })
    };

    const promptCreate = (fileName?: string) => {
        // timeout to avoid instant validation of the dialog's form.
        setTimeout(() => {
            toggleOpen(true);
            setDialogValue({
                path_lower: typeof fileName === 'undefined' ? '' : fileName.endsWith('.json') ? fileName : fileName + '.json'
            });
        });
    }
    return (
        <>
            {children({ promptCreate })}
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <form onSubmit={handleSubmit}>
                    <DialogTitle id="form-dialog-title">Create a new document</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Create a new document in Dropbox
                        </DialogContentText>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="path_lower"
                            value={dialogValue.path_lower}
                            onChange={(event) => setDialogValue({ ...dialogValue, path_lower: event.target.value })}
                            label="FileName"
                            type="text"
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleClose} color="primary">
                            Cancel
                        </Button>
                        <Button type="submit" color="primary">
                            Add
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </>
    );
}
