import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import SettingsIcon from '@mui/icons-material/Settings';
import Card from '@mui/material/Card';
import Masonry from '@mui/lab/Masonry';
import { Button, CardActions, CardContent, CardHeader, IconButton, useTheme } from '@mui/material';
// import { replaceDrawingsAction } from "../../Excalidraw/store/actions";
// import { replaceDocsAction } from "../../SlateGraph/store/actions";
// import { selectFilePathAction } from "../store/actions";
import { useDbxEntries } from '../hooks/useDbxEntries';
import moment from 'moment'
import { RootState } from '../../store/createRootReducer';
import AddIcon from '@mui/icons-material/Add';
import CreateCollectionDialog from './CreateFileDialog';



const DbxFilesOverview: React.FC<{}> = (props) => {
    const { dbx, entries, loadExistingFile } = useDbxEntries();
    const currFile: string | null = useSelector((state: RootState) => state.auth.state === 'authorized' ? state.auth.selectedFilePath : null)
    const dispatch = useDispatch();
    const theme = useTheme()
    if (!entries) {
        return null;
    }

    console.log({ entries })
    return (
        <div>
            <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={1}>
                {entries.map((item, index) => (
                    item['.tag'] === 'file' && item.path_lower &&
                    <Card key={index}>
                        <CardHeader title={item.name.endsWith('.json') ? item.name.slice(0, '.json'.length * -1) : item.name} />
                        <CardContent>
                            <table>
                                <tr><th>Last modified</th><td>{moment(item.server_modified).format('MM/DD/YYYY')}</td></tr>
                                <tr><th>Size</th><td>{item.size / 1000.0}<em>kb</em></td></tr>
                            </table>
                        </CardContent>
                        <CardActions style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {item.path_lower === currFile ? <span /> : <Button onClick={() => {
                                loadExistingFile(item.path_lower!)
                            }} size="small" variant="outlined" color="primary">Open</Button>}
                            <IconButton size="small"><SettingsIcon /></IconButton>
                        </CardActions>
                    </Card>
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
