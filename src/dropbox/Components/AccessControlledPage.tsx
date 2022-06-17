import React, { useContext } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";
import { DropboxAuth } from "dropbox";
import { CircularProgress } from "@mui/material";
import MergeEditorWrap from "../resolveMerge/components/MergePopup";
import Layout from '../../components/Layout';
import LandingPage from "./LandingPage";
import { fileSelectPendingContext, FileSelectPendingProvider } from "../contexts/fileSelectPending";
import Home from "../../components/Home";
// aka app key
const CLIENT_ID = "24bu717gh43au0o";
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

  const mergeResolvedKey = useSelector((state: RootState) => Boolean(state.merge.state === 'resolved'))
  if (!isAuthorized) {
    return <LandingPage dbxAuth={doAuth}>Authorize</LandingPage>
  }
  const content = <FileSelectPendingWrapper key={mergeResolvedKey + ''}>
    <div>{fileSelected ? props.children :
     // <PickDbxFile />
      <div>
          <Home />
      </div>
     }</div>
  </FileSelectPendingWrapper>

  return <FileSelectPendingProvider><div>
    <Layout>
      <div>
        <MergeEditorWrap>
          {content}
        </MergeEditorWrap>
      </div>

    </Layout>
  </div>
  </FileSelectPendingProvider>;
};
export default AccessControlledPage;
