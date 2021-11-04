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
  const auth = useSelector((state: RootState) => state.auth);
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
  return auth.state === "not_authorized"
    ? renderLogin()
    : !auth.syncing || auth.syncing._type === "initial"
    ? null
    : auth.syncing._type === "debounced_pending"
    ? renderDebouncePending()
    : auth.syncing._type === "request_pending"
    ? renderRequestPending()
    : auth.syncing._type === "failure"
    ? renderFailure(auth.syncing.error, auth.syncing.date)
    : renderSuccess(auth.syncing.date);
};

export default SyncStatus;
