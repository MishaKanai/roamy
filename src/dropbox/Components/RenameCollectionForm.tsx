import {
  Alert,
  Button,
  CircularProgress,
  TextField,
  useTheme,
} from "@mui/material";
import React from "react";
import { useRenameCollection } from "../hooks/useDbxEntries";

const RenameCollectionForm = (props: { collectionName: string }) => {
  const [collectionName, setCollectionName] = React.useState(
    props.collectionName
  );
  const rename = useRenameCollection();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const theme = useTheme();
  return (
    <div>
      <div style={{ display: "flex", marginBottom: theme.spacing(1) }}>
        <TextField
          label="Collection Name"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
          style={{ marginRight: "1em" }}
        />
        <div
          style={{
            display: "inline-block",
            alignSelf: "flex-end",
          }}
        >
          <Button
            onClick={async () => {
              setPending(true);
              setError(null);
              try {
                await rename(props.collectionName, collectionName);
              } catch (e: any) {
                setError(e.message);
              }
              setPending(false);
            }}
            variant="contained"
            disabled={
              pending ||
              collectionName === props.collectionName ||
              !collectionName.trim() ||
              collectionName.trim() !== collectionName
            }
            endIcon={pending ? <CircularProgress size={20} /> : undefined}
          >
            Rename
          </Button>
        </div>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
    </div>
  );
};

export default RenameCollectionForm;
