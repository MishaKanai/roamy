import { CircularProgress } from "@mui/material";
import { DropboxResponseError } from "dropbox";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";
import WarnIcon from "@mui/icons-material/Warning";
import "./TypingIndicator.css";

export const TypingIndicator: React.FC<{}> = () => (
  <div className="typing">
    <div className="typing__dot"></div>
    <div className="typing__dot"></div>
    <div className="typing__dot"></div>
  </div>
);

interface SyncStatusProps {}
const SyncStatus: React.FC<SyncStatusProps> = (props) => {
  const collection = useSelector((state: RootState) => state.dbx.collection);
  const renderLogin = () => null;
  const renderDebouncePending = () => <TypingIndicator />;
  const renderRequestPending = () => (
    <span style={{ display: 'block', margin: 'auto', marginTop: '5px' }}>
      <CircularProgress thickness={6} size={22} />
    </span>
  );
  const renderFailure = (error: DropboxResponseError<unknown>, date: Date) => (
      <WarnIcon color="error" style={{ display: 'block', margin: 'auto'}} />
  );
  const renderSuccess = (date: Date) => null;
  return collection.state === "not_authorized"
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
};

export default SyncStatus;
