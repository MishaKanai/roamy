import { CircularProgress } from "@mui/material";
import { DropboxResponseError } from "dropbox";
import React from "react";
import WarnIcon from "@mui/icons-material/Warning";
import "./TypingIndicator.css";
import { useAppSelector } from "../../store/hooks";

export const TypingIndicator: React.FC<{}> = () => (
  <div className="typing">
    <div className="typing__dot"></div>
    <div className="typing__dot"></div>
    <div className="typing__dot"></div>
  </div>
);

interface SyncStatusProps {
  spinnerSize?: number;
}
const SyncStatus: React.FC<SyncStatusProps> = ({ spinnerSize = 22 }) => {
  const collection = useAppSelector((state) => state.dbx.collection);
  const renderLogin = () => null;
  const renderTypingIndicator = () => <TypingIndicator />;
  const renderSpinner = (opacity: number) => (
    <span style={{ display: "block", margin: "auto", height: spinnerSize }}>
      <CircularProgress
        style={{ opacity: "" + opacity }}
        color="primary"
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
      ? renderSpinner(0.25) // renderDebouncePending()
      : collection.syncing._type === "request_pending"
      ? renderSpinner(0.5)
      : collection.syncing._type === "failure"
      ? renderFailure(collection.syncing.error, collection.syncing.date)
      : renderSuccess(collection.syncing.date);
  return syncElem;
};

export default SyncStatus;
