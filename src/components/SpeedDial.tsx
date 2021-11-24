import * as React from 'react';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import { styled } from '@mui/material/styles';
import CreateIcon from '@mui/icons-material/Create';
import SubjectIcon from '@mui/icons-material/Subject';
import { Button, Dialog, DialogContent, DialogTitle, TextField, DialogActions } from '@mui/material';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import capitalize from 'lodash/capitalize';

const CreateDialog: React.FC<{ open: boolean, handleClose: () => void, docType: 'doc' | 'drawing' }> = ({ open, handleClose, docType }) => {
  const [name, setName] = React.useState('');
  const typeDisplayText = docType === 'doc' ? 'concept' : 'drawing';
  const dispatch = useDispatch();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {    
    event.preventDefault();
    if (name) {
      dispatch(push(docType === 'doc' ? `/docs/${name}` : `/drawings/${name}`));
      handleClose()
    }
  };
  return <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
  <form onSubmit={handleSubmit}>
      <DialogTitle id="title">Create a new {typeDisplayText}</DialogTitle>
      <DialogContent>
          <TextField
              autoFocus
              margin="dense"
              id="path_lower"
              value={name}
              onChange={event => setName(event.target.value)}
              label={capitalize(typeDisplayText) + ' name'}
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
}

const StyledSpeedDial = styled(SpeedDial)(({ theme }) => ({
    position: 'absolute',
    '&.MuiSpeedDial-directionUp, &.MuiSpeedDial-directionLeft': {
      bottom: theme.spacing(2),
      right: theme.spacing(2),
    },
    '&.MuiSpeedDial-directionDown, &.MuiSpeedDial-directionRight': {
      top: theme.spacing(2),
      left: theme.spacing(2),
    },
  }));


export default function MainSpeedDial() {
  const [open, setOpen] = React.useState<'none' | 'drawing' | 'doc'>('none');
  return (
    <>
      {open !== 'none' && (<CreateDialog
        open
        docType={open}
        handleClose={() => setOpen('none')}
      />)}
      <StyledSpeedDial
        ariaLabel="Create"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<CreateIcon />}
          tooltipTitle="Create Drawing"
          onClick={() => setOpen('drawing')}
        />
        <SpeedDialAction
          icon={<SubjectIcon />}
          tooltipTitle="Create Concept"
          onClick={() => setOpen('doc')}
        />
      </StyledSpeedDial>
    </>
  );
}
