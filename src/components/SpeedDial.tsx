import * as React from 'react';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import { styled } from '@mui/material/styles';
import CreateIcon from '@mui/icons-material/Create';
import SubjectIcon from '@mui/icons-material/Subject';
import DeleteIcon from '@mui/icons-material/Delete';
import { Button, Dialog, DialogContent, DialogTitle, TextField, DialogActions } from '@mui/material';
import { useDispatch } from 'react-redux';
import { push } from 'connected-react-router';
import capitalize from 'lodash/capitalize';
import { useLocation, } from 'react-router';
import { deleteDrawingAction } from '../Excalidraw/store/actions';
import { deleteDocAction } from '../SlateGraph/store/actions';

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

const DeleteDialog: React.FC<{ open: boolean, handleClose: () => void, name: string; docType: 'doc' | 'drawing' }> = ({ open, handleClose, docType, name }) => {
  const typeDisplayText = docType === 'doc' ? 'concept' : 'drawing';
  const dispatch = useDispatch();
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {    
    event.preventDefault();
    dispatch(push('/'))
    if (docType === 'drawing') {
      dispatch(deleteDrawingAction(name))
    } else {
      dispatch(deleteDocAction(name))
    }
    handleClose()
  };
  return <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
  <form onSubmit={handleSubmit}>
      <DialogTitle id="title">Delete {typeDisplayText} "{name}"</DialogTitle>
      <DialogActions>
          <Button onClick={handleClose} color="primary">
              Cancel
          </Button>
          <Button type="submit" color="warning">
              Delete&nbsp;<DeleteIcon />
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


const DRAWROUTE = '/drawings/';
const DOCROUTE = '/docs/'
const MainSpeedDial = React.memo(() => {
  const [open, setOpen] = React.useState<'none' | 'drawing' | 'doc' | 'delete'>('none');
  const { pathname } = useLocation()
  const onDrawingPage = pathname?.includes(DRAWROUTE)
  const onDocsPage = pathname?.includes(DOCROUTE)
  const name = React.useMemo(() => {
    if (onDrawingPage) {
      return pathname.slice(DRAWROUTE.length)
    }
    if (onDocsPage) {
      return pathname.slice(DOCROUTE.length)
    }
  }, [onDrawingPage, onDocsPage, pathname])
  return (
    <>
      {(open === 'drawing' || open === 'doc') ? (<CreateDialog
        open
        docType={open}
        handleClose={() => setOpen('none')}
      />) : open === 'delete' && name ? <DeleteDialog
        open
        name={name}
        docType={onDrawingPage ? 'drawing' : 'doc'}
        handleClose={() => setOpen('none')}
    /> : null}
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
        {(onDrawingPage || onDocsPage) && name ? (
          <SpeedDialAction
            icon={<DeleteIcon />}
            tooltipTitle={"Delete " + (onDrawingPage ? 'Drawing' : 'Concept')}
            onClick={() => setOpen('delete')}
          />  
        ) : null}
      </StyledSpeedDial>
    </>
  );
})
export default MainSpeedDial;
