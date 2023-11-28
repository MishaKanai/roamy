import { Box, CircularProgress } from "@mui/material";
import { DropboxResponseError } from "dropbox";
import React from "react";
import WarnIcon from "@mui/icons-material/Warning";
import "./TypingIndicator.css";
import { useAppSelector } from "../../store/hooks";
import { css } from "@emotion/css";

export const TypingIndicator: React.FC<{}> = () => (
  <div className="typing">
    <div className="typing__dot"></div>
    <div className="typing__dot"></div>
    <div className="typing__dot"></div>
  </div>
);

interface SyncStatusProps {
  spinnerSize: number;
}
const SyncStatus: React.FC<SyncStatusProps> = ({ spinnerSize = 22 }) => {
  const collection = useAppSelector((state) => state.dbx.collection);
  const renderLogin = () => null;
  const renderDebouncePending = () => <TypingIndicator />;
  const renderRequestPending = () => (
    <span style={{ display: "block", margin: "auto", height: spinnerSize }}>
      <CircularProgress
        style={{ opacity: ".5" }}
        color="secondary"
        thickness={6}
        size={spinnerSize}
      />
    </span>
  );
  const renderFailure = (error: DropboxResponseError<unknown>, date: Date) => (
    <WarnIcon color="error" style={{ display: "block", margin: "auto" }} />
  );
  const renderSuccess = (date: Date) => null; // TODO? element which shows check/saved, and disappears after a second.

  const syncElem =
    collection.state === "not_authorized"
      ? renderLogin()
      : !collection.syncing || collection.syncing._type === "initial"
      ? null
      : collection.syncing._type === "debounced_pending"
      ? renderDebouncePending()
      : collection.syncing._type === "request_pending"
      ? renderRequestPending()
      : collection.syncing._type === "failure"
      ? renderFailure(collection.syncing.error, collection.syncing.date)
      : renderSuccess(collection.syncing.date);
  return (
    <div
      style={{
        position: "relative",
        height: spinnerSize,
      }}
    >
      <div
        className={css`
          margin: 0;
          position: absolute;
          top: 50%;
          -ms-transform: translateY(-50%);
          transform: translateY(-50%);
        `}
      >
        <div
          style={{
            width: spinnerSize,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <div>{syncElem}</div>
        </div>
      </div>
    </div>
  );
};

export default SyncStatus;
