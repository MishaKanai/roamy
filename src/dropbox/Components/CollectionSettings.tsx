import * as React from "react";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {
  Button,
  CardActions,
  CardContent,
  CardHeader,
  CircularProgress,
  List,
  ListItem,
} from "@mui/material";
import useDeleteCollection from "../hooks/useDeleteCollection";
import { push as pushAction } from "connected-react-router";
import { useFetchCollections } from "../hooks/useDbxEntries";
import useDbx from "../hooks/useDbx";
import { useLocation } from "react-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { clearCurrentFile } from "../store/activeCollectionSlice";
import RenameCollectionForm from "./RenameCollectionForm";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    "aria-controls": `vertical-tabpanel-${index}`,
  };
}

const DeleteButton: React.FC<{ filename: string; onDelete?: () => void }> = ({
  filename,
  onDelete,
}) => {
  const dbx = useDbx();
  const pathname = useLocation().pathname;
  const currFile = useAppSelector((state) =>
    state.dbx.collection.state === "authorized"
      ? state.dbx.collection.selectedFilePath
      : null
  );
  const fetchCollections = useFetchCollections(dbx);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useAppDispatch();
  const deleteCollection = useDeleteCollection();
  return (
    <Button
      onClick={() => {
        setLoading(true);
        deleteCollection(
          filename,
          () => {
            if (currFile === filename) {
              dispatch(clearCurrentFile());
            }
            setLoading(false);
            onDelete?.();
            if (pathname === "/") {
              fetchCollections();
            } else {
              dispatch(pushAction("/"));
            }
          },
          () => {
            setLoading(false);
          }
        );
      }}
      disabled={loading}
      color="error"
    >
      Delete
      {loading ? (
        <>
          &nbsp;
          <CircularProgress size={22} />
        </>
      ) : null}
    </Button>
  );
};

interface CollectionSettingsProps {
  collectionFile?: string;
  onDelete?: () => void;
}
const CollectionSettings: React.FC<CollectionSettingsProps> = ({
  collectionFile: _collectionFile,
  onDelete,
}) => {
  const currFile = useAppSelector((state) =>
    state.dbx.collection.state === "authorized"
      ? state.dbx.collection.selectedFilePath
      : null
  );
  const collectionFile = _collectionFile || currFile;
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  if (!collectionFile) {
    return null;
  }
  const collectionName = collectionFile.slice(
    1,
    collectionFile.lastIndexOf("/")
  );
  return (
    <Box sx={{ flexGrow: 1, bgcolor: "background.paper", display: "flex" }}>
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleChange}
        aria-label="Vertical tabs example"
        sx={{ borderRight: 1, borderColor: "divider" }}
      >
        <Tab label="General" {...a11yProps(0)} />
        <Tab label="Delete Collection" {...a11yProps(1)} />
      </Tabs>
      <TabPanel value={value} index={0}>
        <div>
          <CardHeader title={collectionName} />
          <RenameCollectionForm collectionName={collectionName} />
          <List>
            <ListItem>
              <Button variant="outlined">Export Collection</Button>
            </ListItem>
            <ListItem>
              <Button variant="outlined">Duplicate Collection</Button>
            </ListItem>
          </List>
        </div>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <CardHeader title={`Delete Collection "${collectionName}"?`} />
        <CardContent>This action is not reversible</CardContent>
        <CardActions>
          <DeleteButton onDelete={onDelete} filename={collectionFile} />
        </CardActions>
      </TabPanel>
    </Box>
  );
};

export default CollectionSettings;
