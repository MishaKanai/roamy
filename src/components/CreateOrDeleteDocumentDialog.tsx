import * as React from "react";
import { Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  DialogActions,
} from "@mui/material";
import { push } from "connected-react-router";
import capitalize from "lodash/capitalize";
import { useLocation } from "react-router";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import hash_sum from "hash-sum";
import { useAppDispatch } from "../store/hooks";
import { deleteDoc } from "../SlateGraph/store/globalActions";
import { deleteDrawing } from "../Excalidraw/store/drawingsSlice";

function DocTypeRadioGroup(props: {
  onChange: (value: "doc" | "drawing") => void;
  value: "doc" | "drawing";
}) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange(
      (event.target as HTMLInputElement).value as "doc" | "drawing"
    );
  };

  return (
    <FormControl>
      <FormLabel id="demo-controlled-radio-buttons-group">Type</FormLabel>
      <RadioGroup
        aria-labelledby="demo-controlled-radio-buttons-group"
        name="controlled-radio-buttons-group"
        value={props.value}
        onChange={handleChange}
      >
        <FormControlLabel value="doc" control={<Radio />} label="Document" />
        <FormControlLabel value="drawing" control={<Radio />} label="Drawing" />
      </RadioGroup>
    </FormControl>
  );
}

const CreateDialog: React.FC<{ open: boolean; handleClose: () => void }> = ({
  open,
  handleClose,
}) => {
  const [docType, setDocType] = React.useState<"doc" | "drawing">("doc");
  const [name, setName] = React.useState("");
  const typeDisplayText = docType === "doc" ? "concept" : "drawing";
  const dispatch = useAppDispatch();
  const placeholderShortId = React.useMemo(() => {
    return hash_sum(Date.now());
  }, []);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const finalName = name || placeholderShortId;
    dispatch(
      push(docType === "doc" ? `/docs/${finalName}` : `/drawings/${finalName}`)
    );
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="title">Create a new {typeDisplayText}</DialogTitle>
        <DialogContent>
          <DocTypeRadioGroup value={docType} onChange={setDocType} />
          <TextField
            placeholder={placeholderShortId}
            autoFocus
            margin="dense"
            id="path_lower"
            value={name}
            onChange={(event) =>
              setName(event.target.value.replace(/\s/g, "-"))
            }
            InputLabelProps={{
              shrink: true,
            }}
            label={capitalize(typeDisplayText) + " name"}
            type="text"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button type="submit" color="primary">
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const DeleteDialog: React.FC<{
  open: boolean;
  handleClose: () => void;
  name: string;
  docType: "doc" | "drawing";
}> = ({ open, handleClose, docType, name }) => {
  const typeDisplayText = docType === "doc" ? "concept" : "drawing";
  const dispatch = useAppDispatch();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch(push("/"));
    if (docType === "drawing") {
      dispatch(deleteDrawing(name));
    } else {
      dispatch(deleteDoc(name));
    }
    handleClose();
  };
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="title">
          Delete {typeDisplayText} "{name}"
        </DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions
          sx={{ display: "flex", justifyContent: "space-between" }}
        >
          <Button onClick={handleClose} color="primary" variant="contained">
            Cancel
          </Button>
          <Button type="submit" color="warning">
            Delete
            <DeleteIcon sx={{ ml: 1 }} />
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const DRAWROUTE = "/drawings/";
const DOCROUTE = "/docs/";

type DialogOpenState = "none" | "create" | "delete";
const CreateOrDeleteDocumentsDialog: React.FC<{
  children: (props: {
    setOpen: (state: DialogOpenState) => void;
    showDelete: boolean;
  }) => JSX.Element;
}> = React.memo((props) => {
  const [open, setOpen] = React.useState<DialogOpenState>("none");
  const { pathname } = useLocation();
  const onDrawingPage = pathname?.includes(DRAWROUTE);
  const onDocsPage = pathname?.includes(DOCROUTE);
  const name = React.useMemo(() => {
    if (onDrawingPage) {
      return pathname.slice(DRAWROUTE.length);
    }
    if (onDocsPage) {
      return pathname.slice(DOCROUTE.length);
    }
  }, [onDrawingPage, onDocsPage, pathname]);
  const showDelete = Boolean((onDrawingPage || onDocsPage) && name);
  return (
    <>
      {open === "create" ? (
        <CreateDialog open handleClose={() => setOpen("none")} />
      ) : open === "delete" && name ? (
        <DeleteDialog
          open
          name={name}
          docType={onDrawingPage ? "drawing" : "doc"}
          handleClose={() => setOpen("none")}
        />
      ) : null}
      {props.children({
        showDelete,
        setOpen,
      })}
    </>
  );
});
export default CreateOrDeleteDocumentsDialog;
