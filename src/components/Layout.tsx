import * as React from 'react';
import Box from '@mui/material/Box';
import moment from 'moment';
import Divider from '@mui/material/Divider';
import { Link } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import SelectedFileAutocomplete from '../dropbox/Components/SelectedFileAutocomplete';
import HomeIcon from '@mui/icons-material/Home';
// import HistoryIcon from '@mui/icons-material/History';
// import CreateIcon from '@mui/icons-material/Create';
// import AddIcon from '@mui/icons-material/Add';
// import SettingsIcon from '@mui/icons-material/Settings';
import { ListSubheader } from '@mui/material';
import { useLocation } from 'react-router';
import { useSelector } from 'react-redux';
import BasicSpeedDial from './SpeedDial';
import useFileSelected from '../dropbox/hooks/useFileSelected';
import NetworkIcon from '../icons/NetworkIcon';
import TableIcon from '../icons/TableIcon';
import PenTipIcon from '../icons/PenTip';
import DocumentIcon from '../icons/DocumentIcon';
import { RootState } from '../store/createRootReducer';
import { parsePath } from '../RecentlyOpened/store/reducer';
import { useDebounce } from 'use-debounce/lib';

const drawerWidth = 240;

const useRecentlyUpdated = () => {
    const _documents = useSelector((state: RootState) => state.documents);
    const _drawings = useSelector((state: RootState) => state.drawings);
    const [drawings] = useDebounce(_drawings, 1000)
    const [documents] = useDebounce(_documents, 1000)
    return React.useMemo(() => {
        return [...Object.values(documents).map(d => ({ ...d, type: 'document' } as const)),
        ...Object.values(drawings).map(d => ({ ...d, type: 'drawing' } as const))
        ].sort((a, b) => {
            const date1 = moment(a.lastUpdatedDate);
            let res = date1.isAfter(b.lastUpdatedDate) ? -1 : date1.isBefore(b.lastUpdatedDate) ? 1 : 0;
            return res;
        })
    }, [documents, drawings])
}
const useRecentlyOpened = () => {
    const { pathname } = useLocation();
    const { documents, drawings } = useSelector((state: RootState) => state.recentlyOpened);
    return React.useMemo(() => {
        const current = parsePath(pathname);
        return [...Object.entries(documents).map(([name, date]) => ({ name, date, type: 'document' } as const)),
        ...Object.entries(drawings).map(([name, date]) => ({ name, date, type: 'drawing' } as const))
        ].filter(({ name, type }) => !current || type !== current.type || name !== current.name)
            .sort((a, b) => {
                const date1 = moment(a.date);
                let res = date1.isAfter(b.date) ? -1 : date1.isBefore(b.date) ? 1 : 0;
                return res;
            })
    }, [documents, drawings, pathname])
}

const RecentlyUpdatedList = () => {
    const recentlyUpdated = useRecentlyUpdated();
    return (
        <div style={{ overflow: 'auto' }}>
            <List dense
                subheader={
                    <ListSubheader component="div" id="nested-list-subheader">
                        Recently Changed
                    </ListSubheader>
                }>
                {recentlyUpdated.map(d => {
                    const key = d.name + ':' + d.type
                    if (d.type === 'document') {
                        return (
                            <ListItem key={key} dense button component={Link} to={`/docs/${d.name}`}>
                                <ListItemIcon>
                                    <DocumentIcon />
                                </ListItemIcon>
                                <ListItemText primary={d.name} />
                            </ListItem>
                        )
                    }
                    return (
                        <ListItem key={key} dense button component={Link} to={`/drawings/${d.name}`}>
                            <ListItemIcon>
                                <PenTipIcon />
                            </ListItemIcon>
                            <ListItemText primary={d.name} />
                        </ListItem>
                    )
                })}
            </List>
        </div>
    )
}

const RecentlyOpenedList = () => {
    const recentlyOpened = useRecentlyOpened();
    return (
        <div style={{ overflow: 'auto' }}>
            <List dense
                subheader={
                    <ListSubheader component="div" id="recentlyopened-list-subheader">
                        Recently Opened
                    </ListSubheader>
                }>
                {recentlyOpened.map(d => {
                    const key = d.name + ':' + d.type
                    if (d.type === 'document') {
                        return (
                            <ListItem key={key} dense button component={Link} to={`/docs/${d.name}`}>
                                <ListItemIcon>
                                    <DocumentIcon />
                                </ListItemIcon>
                                <ListItemText primary={d.name} />
                            </ListItem>
                        )
                    }
                    return (
                        <ListItem key={key} dense button component={Link} to={`/drawings/${d.name}`}>
                            <ListItemIcon>
                                <PenTipIcon />
                            </ListItemIcon>
                            <ListItemText primary={d.name} />
                        </ListItem>
                    )
                })}
            </List>
        </div>
    )
}

interface ResponsiveDrawerProps {
    children: JSX.Element;
}
const ResponsiveDrawer = React.memo((props: ResponsiveDrawerProps) => {
    const fileSelected = useFileSelected();
    const fileLoaded = Boolean(fileSelected);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const pathname = useLocation().pathname
    const atHome = pathname === '/' || pathname === '';

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div>
                    <div style={{ margin: '1em' }}>
                        <SelectedFileAutocomplete />
                    </div>
                    <Divider />
                    {fileLoaded && <div>
                        <List dense>
                            <ListItem dense button component={Link} to="/docs">
                                <ListItemIcon>
                                    <TableIcon />
                                </ListItemIcon>
                                <ListItemText primary="Concepts" />
                            </ListItem>
                            <ListItem dense button component={Link} to="/graph">
                                <ListItemIcon>
                                    <NetworkIcon />
                                </ListItemIcon>
                                <ListItemText primary="Graph View" />
                            </ListItem>
                            {/*
                        <ListItem dense button>
                            <ListItemIcon>
                                <HistoryIcon />
                            </ListItemIcon>
                            <ListItemText primary="History" />
                        </ListItem>
                        */}
                        </List>
                        <Divider />
                    </div>}
                </div>
                {/* <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row-reverse', padding: '4px 16px' }}>
                    <IconButton color="primary" size="small">
                        <AddIcon />
                    </IconButton>
                </div> */}
                {fileLoaded && <RecentlyOpenedList />}
                {false && fileLoaded && <RecentlyUpdatedList />}
            </div>
            <div>
                {!atHome && (<>
                    <Divider />
                    <List dense>
                        <ListItem dense button component={Link} to="/">
                            <ListItemIcon>
                                <HomeIcon />
                            </ListItemIcon>
                            <ListItemText primary="Home" />
                        </ListItem>
                    </List>
                </>)}
                <Divider />
                <List dense>
                    {/* <ListItem dense button>
                        <ListItemIcon>
                            <SettingsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItem> */}
                    <ListItem dense button onClick={() => {
                        localStorage.clear()
                        window.location.href = "/";
                    }}>
                        <ListItemIcon>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItem>
                </List>
            </div>
        </div>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { sm: 'none' }, position: 'fixed', left: '.6rem', top: '1px', zIndex: 5 }}
            >
                <MenuIcon />
            </IconButton>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', sm: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, pl: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
                {props.children}
                {fileLoaded && !atHome && <BasicSpeedDial />}
            </Box>
        </Box>
    );
})

export default ResponsiveDrawer;
