import React, { useMemo } from "react";
import Grow from "@mui/material/Grow";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import { Theme } from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
import createStyles from '@mui/styles/createStyles';
import Link from "../components/Link";
import { RootState } from "../store/createRootReducer";
import { useSelector } from "react-redux";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: "flex",
    },
    paper: {
      marginRight: theme.spacing(2),
    },
  })
);

export default function HoverBacklinks({
  selectBacklinks,
  dontInclude,
}: {
  selectBacklinks: (state: RootState) => string[] | undefined;
  dontInclude?: string[];
}) {
  const classes = useStyles();
  const allBackReferences = useSelector(selectBacklinks);
  const backReferences = useMemo(() => {
    if (dontInclude) {
      return allBackReferences?.filter((r) => !dontInclude.includes(r));
    }
    return allBackReferences;
  }, [allBackReferences, dontInclude]);
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    setOpen(true);
  };
  function handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Tab") {
      event.preventDefault();
      setOpen(false);
    }
  }
  if (!backReferences?.length) {
    return null;
  }
  return (
    <div className={classes.root}>
      <div onMouseLeave={() => setOpen(false)}>
        <button
          className="roamy-linkbutton"
          ref={anchorRef}
          aria-controls={open ? "menu-list-grow" : undefined}
          aria-haspopup="true"
          onMouseEnter={handleOpen}
        >
          {backReferences.length} {dontInclude ? "other " : ""}backLink
          {backReferences.length > 1 ? "s" : ""}
        </button>
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          role={undefined}
          transition
          style={{ zIndex: 999999 }}
          disablePortal={true}
        >
          {({ TransitionProps, placement }) => (
            <Grow
              {...TransitionProps}
              style={{
                transformOrigin:
                  placement === "bottom" ? "center top" : "center bottom",
              }}
            >
              <Paper>
                <ul
                  style={{
                    listStyleType: "none",
                    padding: ".5em",
                    margin: 0,
                  }}
                  id="menu-list-grow"
                  onKeyDown={handleListKeyDown}
                >
                  {backReferences.map((br) => (
                    <li key={br}>
                      <Link to={`/docs/${br}`}>{br}</Link>
                    </li>
                  ))}
                </ul>
              </Paper>
            </Grow>
          )}
        </Popper>
      </div>
    </div>
  );
}
