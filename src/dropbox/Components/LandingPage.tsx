import { Button, Typography } from '@mui/material';
import React from 'react';
import Attachment from '@mui/icons-material/Attachment'
import DropboxIcon from '../../icons/DropboxIcon';

const LandingPage: React.FC<{
    dbxAuth: () => void;
}> = props => {
    return (
        <div style={{ height: '100%' }}>
            <div style={{ width: '100%', position: 'fixed', top: 100, textAlign: 'center' }}>
                <Typography variant="h2">Rhyz(oam)</Typography>
                <Typography variant="body1">
                    A second brain without organs
                </Typography>
            </div>
            <div style={{
                display: 'grid',
                alignContent: 'center',
                height: '100%'
            }}>
                <div>
                    {/* <div style={{ width: '100%', textAlign: 'center' }}><Typography variant="h1">Rhyzoam</Typography></div> */}
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-evenly' }}>
                        <Button onClick={props.dbxAuth}>Use Dropbox&nbsp;
                           <DropboxIcon />
                        </Button>
                        <Button disabled>Work locally (coming soon)&nbsp;<Attachment /></Button>
                    </div>
                </div>
            </div>
        </div>

    )
}

export default LandingPage;