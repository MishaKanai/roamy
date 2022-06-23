/* eslint-disable no-use-before-define */
import React, { useEffect, useMemo } from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { files } from "dropbox";
import { useDbxEntries } from '../hooks/useDbxEntries';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/createRootReducer';
import CreateCollectionDialog from './CreateCollectionDialog';
import { push as pushAction } from 'connected-react-router';

const filter = createFilterOptions<DropboxFileOptionType>();

export default function SelectedFileAutocomplete() {
    const currentFilePath = useSelector((state: RootState) => state.dbx.collection.state === 'authorized' ? state.dbx.collection.selectedFilePath : null)
    const { collectionsState, loadExistingCollection } = useDbxEntries();
    const dbxEntries: DropboxFileOptionType[] = React.useMemo(() => {
        const entries = collectionsState._tag === 'success' ? collectionsState.data : collectionsState._tag === 'pending' ? collectionsState.prevData ?? null : null;
        return entries?.flatMap(entry =>
            entry['.tag'] === 'file' && entry.path_lower ?
                [{ path_lower: entry.path_lower, title: entry.path_lower, inputValue: entry.path_lower }] :
                []
        ) ?? []
    }, [collectionsState])
    const initialValue = useMemo(() => currentFilePath ? {
        path_lower: currentFilePath,
        title: currentFilePath
    } : null, [currentFilePath])
    const [value, setValue] = React.useState<DropboxFileOptionType | null>(initialValue);
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue])
    const dispatch = useDispatch();
    return (
        <CreateCollectionDialog onCreate={filename => {
            setValue({
                title: filename,
                path_lower: filename
            });
            dispatch(pushAction('/graph'))
        }}>{({ promptCreate }) => (
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
                            newValue.path_lower && loadExistingCollection(newValue.path_lower)
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
        )}</CreateCollectionDialog>
    );
}

interface DropboxFileOptionType extends Pick<files.FileMetadataReference, 'path_lower'> {
    inputValue?: string;
    title: string;
}
