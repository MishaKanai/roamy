import React from 'react';
import { useSelector } from "react-redux";
import SettingsIcon from '@mui/icons-material/Settings';
import Card from '@mui/material/Card';
import Masonry from '@mui/lab/Masonry';
import { Button, CardActions, CardContent, CardHeader, CircularProgress, IconButton, Typography, useTheme } from '@mui/material';
import { useDbxEntries } from '../hooks/useDbxEntries';
import moment from 'moment'
import { RootState } from '../../store/createRootReducer';
import AddIcon from '@mui/icons-material/Add';
import CreateCollectionDialog from './CreateCollectionDialog';
import Popup from '../../components/Popup';
import CollectionSettings from './CollectionSettings';
import ErrorOutline from '@mui/icons-material/ErrorOutline';



const DbxFilesOverview: React.FC<{}> = (props) => {
    const { collectionsState, loadExistingCollection } = useDbxEntries();
    const currFile: string | null = useSelector((state: RootState) => state.dbx.collection.state === 'authorized' ? state.dbx.collection.selectedFilePath : null)
    const theme = useTheme()
    if (collectionsState._tag === 'error' || (collectionsState._tag === 'pending'  && !collectionsState.prevData)) {
        return <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div>
            {collectionsState._tag === 'pending' ? <CircularProgress size={48} /> : <ErrorOutline fontSize="large" color="error" />}
          </div>
          <p>
            {collectionsState._tag === 'pending' ? <Typography>Loading Collections...</Typography> :
              <Typography>{typeof collectionsState.error.status === 'number' ? `${collectionsState.error.status} Error` : 'Failed to fetch collections data'}</Typography>
            }
          </p>
        </div>
      </div>
        // return <div>Failed to fetch</div>
    }
    if (collectionsState._tag === 'initial') {
        return null;
    }
    if (collectionsState._tag === 'success' && !collectionsState.data) {
        return null;
    }
    return (
        <div style={collectionsState._tag === 'pending' ? { opacity: .8 } : undefined }>
            <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={1}>
                {(collectionsState._tag === 'success' ? collectionsState.data : collectionsState.prevData)?.flatMap((item, index) => (
                    item['.tag'] === 'file' && item.path_lower && item.path_lower.endsWith('/index.json') ?
                    [<Card key={index}>
                        <CardHeader title={item.path_lower.slice(1 /* starting '/' */, '/index.json'.length * -1)} />
                        <CardContent>
                            <table>
                                <tr><th>Last modified</th><td>{moment(item.server_modified).format('MM/DD/YYYY')}</td></tr>
                                <tr><th>Size</th><td>{item.size / 1000.0}<em>kb</em></td></tr>
                            </table>
                        </CardContent>
                        <CardActions style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {item.path_lower === currFile ? <span /> : <Button onClick={() => {
                                loadExistingCollection(item.path_lower!)
                            }} size="small" variant="outlined" color="primary">Open</Button>}
                            <Popup<string>
                                renderDialogContent={({ closeDialog, optionalData }) => (
                                    <CollectionSettings onDelete={closeDialog} collectionFile={optionalData!} />
                                )}
                                renderToggler={({ openDialog }) => (
                                    <IconButton onClick={openDialog(item.path_lower!)} size="small"><SettingsIcon /></IconButton>
                                )}
                            />
                        </CardActions>
                    </Card>] : []
                ))}
                <CreateCollectionDialog>{({ promptCreate }) => (
                    <div style={{ border: '1px dashed ' + theme.palette.primary.main, position: 'relative', borderRadius: '4px' }}>
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}><Button onClick={() => promptCreate()} color="primary">Create a new Collection <AddIcon /></Button></div>
                    <Card style={{ visibility: 'hidden' }}>
                        <CardHeader title="spacer" />
                        <CardContent>
                            <table>
                                <tr><th>Last modified</th><td>01/07/2022</td></tr>
                                <tr><th>Size</th><td>2.000kb</td></tr>
                            </table>
                        </CardContent>
                        <CardActions>
                            <Button size="small">spacer</Button>
                            <IconButton size="small"><SettingsIcon /></IconButton>
                        </CardActions>
                    </Card>
                </div>
                )}</CreateCollectionDialog>
                
            </Masonry>
        </div>
    );
};

export default DbxFilesOverview;
