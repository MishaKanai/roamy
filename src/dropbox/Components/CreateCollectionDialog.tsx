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
    onCreate?: (collectionName: string) => void;
    children: (props: { promptCreate: (collectionName?: string) => void; }) => JSX.Element;
}
export default function CreateCollectionDialog({ onCreate, children }: CreateCollectionDialogProps) {
    const { createNewEmptyCollection } = useDbxEntries();
    const [open, toggleOpen] = React.useState(false);

    const [dialogValue, setDialogValue] = React.useState({
        collectionName: '',
    });

    const handleClose = () => {
        setDialogValue({
            collectionName: ''
        });
        toggleOpen(false);
    };

    // called from dialog
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const { collectionName } = dialogValue;
        createNewEmptyCollection(collectionName)?.then(cnf => {
            onCreate?.(collectionName);
            handleClose();
        })
    };

    const promptCreate = (collectionName?: string) => {
        // timeout to avoid instant validation of the dialog's form.
        setTimeout(() => {
            toggleOpen(true);
            setDialogValue({
                collectionName: typeof collectionName === 'undefined' ? '' : collectionName
            });
        });
    }
    return (
        <>
            {children({ promptCreate })}
            <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
                <form onSubmit={handleSubmit}>
                    <DialogTitle id="form-dialog-title">Create a new collection</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Create a new collection in Dropbox
                        </DialogContentText>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="path_lower"
                            value={dialogValue.collectionName}
                            onChange={(event) => setDialogValue({ ...dialogValue, collectionName: event.target.value })}
                            label="Collection Name"
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
