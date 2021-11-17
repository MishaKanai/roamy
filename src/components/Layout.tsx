import * as React from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { Link } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import SubjectIcon from '@mui/icons-material/Subject';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';
import LogoutIcon from '@mui/icons-material/Logout';
import SelectedFileAutocomplete from '../dropbox/Components/SelectedFileAutocomplete';
import HistoryIcon from '@mui/icons-material/History';
import CreateIcon from '@mui/icons-material/Create';
import { ListSubheader } from '@mui/material';
import { useSelector } from 'react-redux';
import { docNamesSelector } from '../SlateGraph/globalSelectors';
import { drawingNamesSelector } from '../Excalidraw/globalSelectors';

const drawerWidth = 240;

interface ResponsiveDrawerProps {
    children: JSX.Element;
}
function ResponsiveDrawer(props: ResponsiveDrawerProps) {
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };
    const docNames = useSelector(docNamesSelector);
    const drawingNames = useSelector(drawingNamesSelector);
    const drawer = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
            <div>
                <div style={{ margin: '1em' }}>
                    <SelectedFileAutocomplete />
                </div>
                <Divider />
                <List dense>
                    <ListItem dense button component={Link} to="/docs">
                        <ListItemIcon>
                            <SearchIcon />
                        </ListItemIcon>
                        <ListItemText primary="Documents" />
                    </ListItem>
                    <ListItem dense button  component={Link} to="/graph">
                        <ListItemIcon>
                            <ScatterPlotIcon />
                        </ListItemIcon>
                        <ListItemText primary="Graph View" />
                    </ListItem>
                    <ListItem dense button>
                        <ListItemIcon>
                            <HistoryIcon />
                        </ListItemIcon>
                        <ListItemText primary="History" />
                    </ListItem>
                </List>
                <Divider />
                <List dense
                    subheader={
                        <ListSubheader component="div" id="nested-list-subheader">
                            Recently Opened
                        </ListSubheader>
                    }>
                    {docNames.map((docName) => (
                        <ListItem key={docName} dense button component={Link} to={`/docs/${docName}`}>
                            <ListItemIcon>
                                <SubjectIcon />
                            </ListItemIcon>
                            <ListItemText primary={docName} />
                        </ListItem>
                    ))}
                    {drawingNames.map((drawingName) => (
                        <ListItem key={drawingName} dense button component={Link} to={`/drawings/${drawingName}`}>
                            <ListItemIcon>
                                <CreateIcon />
                            </ListItemIcon>
                            <ListItemText primary={drawingName} />
                        </ListItem>
                    ))}
                </List>
            </div>
            <div>
                <Divider />
                <List dense>
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
            </Box>
        </Box>
    );
}

export default ResponsiveDrawer;
