import { DeleteOutline, Edit } from "@mui/icons-material";
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  useTheme,
} from "@mui/material";
import React from "react";
import { useDispatch } from "react-redux";
import Popup from "./Popup";
import { useAppSelector } from "../store/hooks";
import { setTitle } from "../SlateGraph/store/slateDocumentsSlice";
import { setDrawingTitle } from "../Excalidraw/store/drawingsSlice";
import isSingleFile from "../util/isSingleFile";
import Link from "./Link";
import CreateOrDeleteDocumentsDialog from "./CreateOrDeleteDocumentDialog";
import nestedEditorContext from "../Autocomplete/nestedEditorContext";

const EditTitleForm = ({
  initialTitle,
  onSubmit,
  docName,
  onCancel,
}: {
  onCancel?: () => void;
  docName?: string;
  initialTitle?: string;
  onSubmit: (data: { title: string }) => void;
}) => {
  const [title, setTitle] = React.useState(initialTitle ?? "");
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ title });
  };
  return (
    <form onSubmit={handleSubmit}>
      <DialogContent>
        <TextField
          placeholder={docName}
          autoFocus
          margin="dense"
          id="path_lower"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          InputLabelProps={{
            shrink: true,
          }}
          label="Document Title"
          type="text"
        />
      </DialogContent>
      <DialogActions>
        {onCancel ? (
          <Button onClick={onCancel} color="primary">
            Cancel
          </Button>
        ) : null}
        <Button type="submit" color="primary">
          Submit
        </Button>
      </DialogActions>
    </form>
  );
};

const useDisplayTitle = (id: string, type: "documents" | "drawings") => {
  return useAppSelector((state) => state[type][id]?.displayName);
};

const EditableTitle = ({
  id,
  type,
  to,
}: {
  id: string;
  type: "documents" | "drawings";
  to?: string;
}) => {
  const displayTitle = useDisplayTitle(id, type);
  const dispatch = useDispatch();
  const [hovered, setHovered] = React.useState(false);
  const theme = useTheme();
  const TitleElement = displayTitle ?? (
    <span
      style={{
        opacity: ".5",
        fontWeight: "lighter",
        fontSize: theme.typography.fontSize - 1,
        color: theme.palette.getContrastText(theme.palette.background.default),
      }}
    >
      {id}
    </span>
  );
  const nestedDepth = React.useContext(nestedEditorContext);
  const backlinks = useAppSelector(
    (state) => state.documents[id]?.backReferences
  );
  return (
    <span
      onMouseLeave={() => setHovered(false)}
      onMouseEnter={() => setHovered(true)}
    >
      {to ? <Link to={to}>{TitleElement}</Link> : TitleElement}
      <Popup
        ComponentProps={{
          "aria-labelledby": "rename-title-dialog",
        }}
        onClose={() => setHovered(false)}
        renderDialogContent={({ closeDialog }) => {
          return (
            <>
              <DialogTitle id="rename-title-dialog">
                Rename {type === "documents" ? "Document" : "Drawing"}
              </DialogTitle>
              <EditTitleForm
                docName={id}
                initialTitle={displayTitle}
                onCancel={closeDialog}
                onSubmit={({ title }) => {
                  const action =
                    type === "documents"
                      ? setTitle({ name: id, displayName: title })
                      : setDrawingTitle({ name: id, displayName: title });
                  dispatch(action);
                  closeDialog();
                }}
              />
            </>
          );
        }}
        renderToggler={({ openDialog }) => {
          return (
            <IconButton
              color="primary"
              onClick={() => {
                openDialog()();
              }}
              style={!hovered ? { visibility: "hidden" } : undefined}
              onFocus={() => setHovered(true)}
              size="small"
            >
              <Edit fontSize="small" />
            </IconButton>
          );
        }}
      />

      {nestedDepth.length === 1 && !backlinks.length ? (
        <CreateOrDeleteDocumentsDialog>
          {({ setOpen }) => (
            <IconButton
              onClick={() =>
                setOpen({
                  _t: "delete",
                  name: id,
                  docType: type === "documents" ? "doc" : "drawing",
                })
              }
              color="error"
              size="small"
              style={!hovered ? { visibility: "hidden" } : undefined}
            >
              <DeleteOutline />
            </IconButton>
          )}
        </CreateOrDeleteDocumentsDialog>
      ) : null}
    </span>
  );
};

const DocTitle = ({
  id,
  editable,
  type,
  to,
}: {
  type: "documents" | "drawings";
  id: string;
  editable?: boolean;
  to?: string;
}) => {
  const theme = useTheme();
  const displayTitle = useDisplayTitle(id, type);
  if (editable && !isSingleFile()) {
    return <EditableTitle type={type} id={id} to={to} />;
  }
  if (!displayTitle) {
    return (
      <span
        style={{
          opacity: ".5",
          fontWeight: "lighter",
          fontSize: theme.typography.fontSize - 1,
          color: theme.palette.getContrastText(
            theme.palette.background.default
          ),
        }}
      >
        {id}
      </span>
    );
  }
  return <>{displayTitle ?? id}</>;
};

export default DocTitle;

// TODO: genericize to be used with drawings as well.
