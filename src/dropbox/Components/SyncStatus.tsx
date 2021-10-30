import { CircularProgress } from "@material-ui/core";
import { DropboxResponseError } from "dropbox";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";
import WarnIcon from "@material-ui/icons/Warning";
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
    <span style={{ margin: 4 }}>
      <CircularProgress thickness={5} size={25} />
    </span>
  );
  const renderFailure = (error: DropboxResponseError<unknown>, date: Date) => (
    <span>
      <WarnIcon />
    </span>
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
