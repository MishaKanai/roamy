import React, { useMemo } from "react";
import Grow from "@mui/material/Grow";
import { useTheme } from "@mui/material";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import { Theme } from "@mui/material/styles";
import makeStyles from "@mui/styles/makeStyles";
import createStyles from "@mui/styles/createStyles";
import Link from "../components/Link";
import { useAppSelector } from "../store/hooks";
import { RootState } from "../store/configureStore";
import DocTitle from "./EditableTitle";

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
  const allBackReferences = useAppSelector(selectBacklinks);
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
  const theme = useTheme();
  if (!backReferences?.length) {
    return null;
  }
  return (
    <div className={classes.root}>
      <div onMouseLeave={() => setOpen(false)}>
        <button
          className="roamy-linkbutton"
          style={{
            color: theme.palette.primary.main,
            fontFamily: theme.typography.fontFamily,
          }}
          ref={anchorRef}
          aria-controls={open ? "menu-list-grow" : undefined}
          aria-haspopup="true"
          onMouseEnter={handleOpen}
          onClick={handleOpen}
        >
          {backReferences.length} {dontInclude ? "other " : ""}backlink
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
                    padding: "3px 6px",
                    margin: 0,
                  }}
                  id="menu-list-grow"
                  onKeyDown={handleListKeyDown}
                >
                  {backReferences.map((br) => (
                    <li key={br}>
                      <Link to={`/docs/${br}`}>
                        <DocTitle id={br} type="documents" />
                      </Link>
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
