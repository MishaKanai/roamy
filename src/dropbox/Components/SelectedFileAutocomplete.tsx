/* eslint-disable no-use-before-define */
import React, { useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { files } from "dropbox";
import { useDbxEntries } from './PickFile';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/createRootReducer';

const filter = createFilterOptions<DropboxFileOptionType>();

export default function SelectedFileAutocomplete() {
    const currentFilePath = useSelector((state: RootState) => state.auth.state === 'authorized' ? state.auth.selectedFilePath : null)
    const { entries, createNewEmptyFile, loadExistingFile } = useDbxEntries();
    const dbxEntries: DropboxFileOptionType[] = React.useMemo(() => {
        return entries?.flatMap(entry =>
            entry['.tag'] === 'file' && entry.path_lower ?
                [{ path_lower: entry.path_lower, title: entry.path_lower, inputValue: entry.path_lower }] :
                []
        ) ?? []
    }, [entries])
    const initialValue = useMemo(() => currentFilePath ? {
        path_lower: currentFilePath,
        title: currentFilePath
    } : null, [currentFilePath])
    const [value, setValue] = React.useState<DropboxFileOptionType | null>(initialValue);
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
            setValue({
                title: fileString,
                path_lower: fileString
            })
            handleClose();
        })
    };

    const promptCreate = (fileName: string) => {
        // timeout to avoid instant validation of the dialog's form.
        setTimeout(() => {
            toggleOpen(true);
            setDialogValue({
                path_lower: fileName.endsWith('.json') ? fileName : fileName + '.json'
            });
        });
    }
    return (
        <React.Fragment>
            <Autocomplete
                value={value}
                onBlur={() => {
                    if (!value) {
                        setValue(initialValue)
                    }
                }}
                onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                        promptCreate(newValue)
                    } else if (newValue && newValue.inputValue) {
                        if (newValue.title?.startsWith('Add "')) {
                            promptCreate(newValue.inputValue)
                        } else {
                            newValue.path_lower && loadExistingFile(newValue.path_lower)
                        }
                        setValue(newValue);
                    } else {
                        setValue(newValue);
                    }
                }}
                filterOptions={(options, params) => {
                    const filtered = filter(options, params) as DropboxFileOptionType[];

                    if (params.inputValue !== '') {
                        const fileName = params.inputValue.endsWith('.json') ? params.inputValue : params.inputValue + '.json';
                        if (!filtered.some(e => {
                            const fn = e.path_lower?.startsWith('/') ? e.path_lower.slice(1) : e.path_lower;
                            return fn === fileName;
                        })) {
                            filtered.push({
                                inputValue: fileName,
                                title: `Add "${params.inputValue}.json"`,
                            });
                        }
                    }

                    return filtered;
                }}
                id="select-file-autocomplete"
                options={dbxEntries}
                getOptionLabel={(option) => {
                    // e.g value selected with enter, right from the input
                    if (typeof option === 'string') {
                        return option;
                    }
                    if (option.inputValue) {
                        return option.inputValue;
                    }
                    return option.title;
                }}
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
                // renderOption={(option) => option.title}
                renderOption={(props, option, { selected }) => (
                    <li {...props}>
                        {option.title}
                    </li>)}
                // style={{ minWidth: 'min(256px, calc(100vw - 70px))' }}
                fullWidth
                freeSolo
                renderInput={(params) => (
                    <TextField {...params} size="small" label="Document" variant="outlined" />
                )}
            />
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
        </React.Fragment>
    );
}

interface DropboxFileOptionType extends Pick<files.FileMetadataReference, 'path_lower'> {
    inputValue?: string;
    title: string;
}
