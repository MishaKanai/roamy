import * as React from "react";
import Box from "@mui/material/Box";
import moment from "moment";
import { Link } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
import LogoutIcon from "@mui/icons-material/Logout";
import SelectedFileAutocomplete from "../dropbox/Components/SelectedFileAutocomplete";
import HomeIcon from "@mui/icons-material/HomeOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import {
  Button,
  Card,
  ListItemButton,
  ListSubheader,
  useTheme,
} from "@mui/material";
import { useLocation } from "react-router";
import useFileSelected from "../dropbox/hooks/useFileSelected";
import { parsePath } from "../RecentlyOpened/store/recentlyOpenedSlice";
import { useDebounce } from "use-debounce";
import { useAppSelector } from "../store/hooks";
import DocTitle from "./EditableTitle";
import isSingleFile from "../util/isSingleFile";
import ExportButton from "../Export/components/ExportButton";
import { useStore } from "react-redux";
import { logOut } from "../dropbox/store/globalActions";
import SyncStatus from "../dropbox/Components/SyncStatus";
import {
  Add,
  ArticleOutlined,
  GestureOutlined,
  GridViewOutlined,
  HubOutlined,
} from "@mui/icons-material";
import { push } from "connected-react-router";
import { TogglePaletteMode } from "../util/theme";
import SpaceUsage from "../dropbox/Components/SpaceUsage";
import CreateOrDeleteDocumentsDialog from "./CreateOrDeleteDocumentDialog";

const drawerWidth = 220;

const useRecentlyUpdated = () => {
  const _documents = useAppSelector((state) => state.documents);
  const _drawings = useAppSelector((state) => state.drawings);
  const [drawings] = useDebounce(_drawings, 1000);
  const [documents] = useDebounce(_documents, 1000);
  return React.useMemo(() => {
    return [
      ...Object.values(documents).map(
        (d) => ({ ...d, type: "document" } as const)
      ),
      ...Object.values(drawings).map(
        (d) => ({ ...d, type: "drawing" } as const)
      ),
    ].sort((a, b) => {
      const date1 = moment(a.lastUpdatedDate);
      let res = date1.isAfter(b.lastUpdatedDate)
        ? -1
        : date1.isBefore(b.lastUpdatedDate)
        ? 1
        : 0;
      return res;
    });
  }, [documents, drawings]);
};
const useRecentlyOpened = () => {
  const { pathname } = useLocation();
  const { documents, drawings } = useAppSelector(
    (state) => state.recentlyOpened
  );
  return React.useMemo(() => {
    const current = parsePath(pathname);
    return [
      ...Object.entries(documents).map(
        ([name, date]) => ({ name, date, type: "document" } as const)
      ),
      ...Object.entries(drawings).map(
        ([name, date]) => ({ name, date, type: "drawing" } as const)
      ),
    ]
      .map((entry) => {
        const { name, type } = entry;
        return {
          ...entry,
          isCurrent: Boolean(
            current && type === current.type && name === current.name
          ),
        };
      })
      .sort((a, b) => {
        const date1 = moment(a.date);
        let res = date1.isAfter(b.date) ? -1 : date1.isBefore(b.date) ? 1 : 0;
        return res;
      });
  }, [documents, drawings, pathname]);
};

const RecentlyUpdatedList = () => {
  const recentlyUpdated = useRecentlyUpdated();
  return (
    <div style={{ overflow: "auto" }}>
      <List
        dense
        subheader={
          <ListSubheader component="div" id="nested-list-subheader">
            Recently Changed
          </ListSubheader>
        }
      >
        {recentlyUpdated.map((d) => {
          const key = d.name + ":" + d.type;
          if (d.type === "document") {
            return (
              <ListItem
                key={key}
                dense
                button
                component={Link}
                to={`/docs/${d.name}`}
              >
                <ListItemIcon>
                  <ArticleOutlined color="primary" />
                </ListItemIcon>
                <ListItemText primary={d.name} />
              </ListItem>
            );
          }
          return (
            <ListItem
              key={key}
              dense
              button
              component={Link}
              to={`/drawings/${d.name}`}
            >
              <ListItemIcon>
                <GestureOutlined color="primary" />
              </ListItemIcon>
              <ListItemText primary={d.name} />
            </ListItem>
          );
        })}
      </List>
    </div>
  );
};

const RecentlyOpenedList = () => {
  const recentlyOpened = useRecentlyOpened();
  if (!recentlyOpened.length) return null;
  return (
    <div style={{ overflow: "auto" }}>
      <List
        dense
        subheader={
          <ListSubheader
            style={{ backgroundColor: "transparent" }}
            component="div"
            id="recentlyopened-list-subheader"
          >
            Recently Opened
          </ListSubheader>
        }
      >
        {recentlyOpened.map((d) => {
          const key = d.name + ":" + d.type;
          if (d.type === "document") {
            return (
              <ListItemButton
                selected={d.isCurrent || undefined}
                /*disabled={d.isCurrent}*/ key={key}
                dense
                component={Link}
                to={`/docs/${d.name}`}
              >
                <ListItemIcon>
                  <ArticleOutlined color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <DocTitle type="documents" editable={false} id={d.name} />
                  }
                />
              </ListItemButton>
            );
          }
          return (
            <ListItemButton
              selected={d.isCurrent || undefined}
              key={key}
              dense
              component={Link}
              to={`/drawings/${d.name}`}
            >
              <ListItemIcon>
                <GestureOutlined color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <DocTitle type="drawings" editable={false} id={d.name} />
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </div>
  );
};

interface ResponsiveDrawerProps {
  children: JSX.Element;
}
const ResponsiveDrawer = React.memo((props: ResponsiveDrawerProps) => {
  const fileSelected = useFileSelected();
  const fileLoaded = Boolean(fileSelected);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = useLocation().pathname;
  const atHome = pathname === "/" || pathname === "";
  const docsPage = pathname === "/docs" || pathname === "/docs/";
  const specificDoc =
    pathname.startsWith("/docs/") && pathname.length > "/docs/".length;
  const graphPage = pathname === "/graph" || pathname === "/graph/";
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  const store = useStore();
  const theme = useTheme();

  const drawer = (
    <Card
      style={{
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div>
          <div style={{ margin: "1em" }}>
            {!isSingleFile() && <SelectedFileAutocomplete />}
          </div>
          {(fileLoaded || isSingleFile()) && (
            <div>
              <List dense>
                <ListItem dense button component={Link} to="/docs">
                  <ListItemIcon>
                    <GridViewOutlined color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Concepts" />
                </ListItem>
                <ListItem dense button component={Link} to="/graph">
                  <ListItemIcon>
                    <HubOutlined color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Graph View" />
                </ListItem>
                {fileLoaded && !atHome && !isSingleFile() && (
                  <CreateOrDeleteDocumentsDialog>
                    {({ setOpen }) => (
                      <ListItem dense>
                        <Button
                          size="small"
                          variant="contained"
                          fullWidth
                          endIcon={<Add />}
                          onClick={() => setOpen({ _t: "create" })}
                        >
                          Create
                        </Button>
                      </ListItem>
                    )}
                  </CreateOrDeleteDocumentsDialog>
                )}
              </List>
            </div>
          )}
        </div>
        {/* <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'row-reverse', padding: '4px 16px' }}>
                    <IconButton color="primary" size="small">
                        <AddIcon />
                    </IconButton>
                </div> */}
        {fileLoaded && <RecentlyOpenedList />}
        {false && fileLoaded && <RecentlyUpdatedList />}
      </div>
      {!isSingleFile() && (
        <div>
          <List dense>
            <ListItem>
              <SpaceUsage />
            </ListItem>
            <ListItem>
              <TogglePaletteMode />
            </ListItem>
            {fileLoaded && (
              <ListItem>
                <ExportButton />
              </ListItem>
            )}
            {!atHome && (
              <ListItem dense button component={Link} to="/">
                <ListItemIcon>
                  <HomeIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Home" />
              </ListItem>
            )}
            <ListItem dense button component={Link} to="/settings">
              <ListItemIcon>
                <SettingsIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
            <ListItem
              dense
              button
              onClick={() => {
                store.dispatch(push("/"));
                store.dispatch(logOut(true));
              }}
            >
              <ListItemIcon>
                <LogoutIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </div>
      )}
    </Card>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={handleDrawerToggle}
        sx={{
          display: { sm: "none" },
          position: "fixed",
          left: ".6rem",
          top: graphPage || docsPage ? "14px" : specificDoc ? "0px" : "1px",
          zIndex: 5,
        }}
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
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              zIndex: 0,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pl: 4,
          width: { xs: "100%", sm: `calc(100% - ${drawerWidth}px)` },
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
        }}
      >
        {props.children}
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: { xs: 0, sm: drawerWidth },
            width: "32px",
            zIndex: 99999999,
          }}
        >
          <div
            style={{
              width: "100%",
              textAlign: "center",
              marginBottom: 4,
              marginLeft: -1, // looks a bit better if closer to the border
            }}
          >
            <SyncStatus spinnerSize={20} />
          </div>
        </Box>
      </Box>
    </Box>
  );
});

export default ResponsiveDrawer;
