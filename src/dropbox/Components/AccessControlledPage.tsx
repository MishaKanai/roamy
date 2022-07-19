import React, { useContext } from "react";
import { DropboxAuth } from "dropbox";
import { CircularProgress, Typography } from "@mui/material";
import MergeEditorWrap from "../resolveMerge/components/MergePopup";
import Layout from '../../components/Layout';
import LandingPage from "./LandingPage";
import { fileSelectPendingContext, FileSelectPendingProvider } from "../contexts/fileSelectPending";
import Home from "../../components/Home";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { useAppSelector } from "../../store/hooks";
import { CLIENT_ID } from "../config";
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
      'none',
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
  return <>{
    state._type === 'ok' ?
      props.children :
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div>
            {state._type === 'pending' ? <CircularProgress size={48} /> : <ErrorOutline fontSize="large" color="error" />}
          </div>
          <div style={{ margin: '1em' }}>
            {state._type === 'pending' ? <Typography>Loading Collection...</Typography> :
              <Typography>{state.message}</Typography>
            }
          </div>
        </div>
      </div>
  }</>
}

const AccessControlledPage: React.FC<AccessControlledPageProps> = (props) => {
  const collection = useAppSelector(state => state.dbx.collection);
  const auth = useAppSelector(state => state.dbx.auth);
  const isAuthorized = auth.state === "authorized";
  const fileSelected =
    collection.state === "authorized" && Boolean(collection.selectedFilePath);

  const mergeResolvedKey = useAppSelector(state => state.merge.state === 'resolved')
  if (!isAuthorized) {
    return <LandingPage dbxAuth={doAuth}>Authorize</LandingPage>
  }
  const content = <FileSelectPendingWrapper key={mergeResolvedKey + ''}>
    <div style={{ height: '100%' }}>{fileSelected ? props.children :
        <Home />
    }</div>
  </FileSelectPendingWrapper>

  return <FileSelectPendingProvider><div>
    <Layout>
      <div style={{ height: '100%' }}>
        <MergeEditorWrap>
          {content}
        </MergeEditorWrap>
      </div>

    </Layout>
  </div>
  </FileSelectPendingProvider>;
};
export default AccessControlledPage;
