import React, { useContext } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";
import { DropboxAuth } from "dropbox";
import PickDbxFile, { fileSelectPendingContext, FileSelectPendingProvider } from "./PickFile";
import SelectedFileAutocomplete from "./SelectedFileAutocomplete";
import { CircularProgress } from "@material-ui/core";

// aka app key
const CLIENT_ID = "9r1uwr2l55chuy7";
// var REDIRECT_URI = 'http://localhost:8080/pkce-browser';
const REDIRECT_URI = window.location.protocol + "//" + window.location.host;
var dbxAuth = new DropboxAuth({
  clientId: CLIENT_ID,
});

function doAuth() {
  dbxAuth
    .getAuthenticationUrl(
      REDIRECT_URI,
      undefined,
      "code",
      "offline",
      undefined,
      undefined,
      true
    )
    .then((authUrl) => {
      window.sessionStorage.clear();
      window.sessionStorage.setItem("codeVerifier", dbxAuth.getCodeVerifier());
      window.location.href = authUrl as string;
    })
    .catch((error) => console.error(error));
}

interface AccessControlledPageProps {
  children: JSX.Element;
}

const FileSelectPendingWrapper: React.FC<{}> = props => {
  const { state } = useContext(fileSelectPendingContext);
  return <>{state._type === 'ok' ? props.children :
    state._type === 'pending' ? <CircularProgress /> : <p>Error:{state.message}</p>}</>
}

const AccessControlledPage: React.FC<AccessControlledPageProps> = (props) => {
  const auth = useSelector((state: RootState) => state.auth);
  const isAuthorized = auth.state === "authorized";
  const fileSelected =
    auth.state === "authorized" && Boolean(auth.selectedFilePath);

  if (!isAuthorized) {
    return (
      <div>
        <button onClick={doAuth}>Authorize</button>
      </div>
    );
  }
  const selectedFileAutocomplete = <div style={{ margin: '1em' }}>
    <SelectedFileAutocomplete />
  </div>
  const content = <FileSelectPendingWrapper>
    <div>{fileSelected ? props.children : <PickDbxFile />}</div>
  </FileSelectPendingWrapper>
  return <FileSelectPendingProvider><div>
    {selectedFileAutocomplete}
    {content}
  </div>
  </FileSelectPendingProvider>;
};
export default AccessControlledPage;
