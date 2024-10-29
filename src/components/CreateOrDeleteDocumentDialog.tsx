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
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import hash_sum from "hash-sum";
import { useAppDispatch } from "../store/hooks";
import { deleteDoc } from "../SlateGraph/store/globalActions";
import { deleteDrawing } from "../Excalidraw/store/drawingsSlice";
import { useLocation } from "react-router";

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
  const location = useLocation();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setImmediate(() => handleClose());
    if (location.pathname === `/docs/${name}`) {
      dispatch(push("/docs"));
    }
    if (docType === "drawing") {
      dispatch(deleteDrawing(name));
    } else {
      dispatch(deleteDoc(name));
    }
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

type DialogOpenState =
  | { _t: "none" }
  | { _t: "create" }
  | { _t: "delete"; docType: "drawing" | "doc"; name: string };
const initial: DialogOpenState = { _t: "none" };

const CreateOrDeleteDocumentsDialog: React.FC<{
  children: (props: {
    setOpen: (state: DialogOpenState) => void;
  }) => JSX.Element;
}> = React.memo((props) => {
  const [open, setOpen] = React.useState<DialogOpenState>(initial);
  return (
    <>
      {open._t === "create" ? (
        <CreateDialog open handleClose={() => setOpen(initial)} />
      ) : open._t === "delete" && open.name ? (
        <DeleteDialog
          open
          name={open.name}
          docType={open.docType}
          handleClose={() => setOpen(initial)}
        />
      ) : null}
      {props.children({
        setOpen,
      })}
    </>
  );
});
export default CreateOrDeleteDocumentsDialog;
