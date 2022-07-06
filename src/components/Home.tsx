import React from 'react';
import DbxFilesOverview from '../dropbox/Components/FilesOverview';

const Home = () => {
    return <div>
        <div style={{ height: '1em'}} />
        <div style={{ marginLeft: '10px' }}>
            <DbxFilesOverview />
        </div>
    </div>
}
export default Home;