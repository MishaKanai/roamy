import React, { useContext, useEffect } from "react";
import { DropboxAuth } from "dropbox";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import MergeEditorWrap from "../resolveMerge/components/MergePopup";
import Layout from "../../components/Layout";
import LandingPage from "./LandingPage";
import {
  fileSelectPendingContext,
  FileSelectPendingProvider,
} from "../contexts/fileSelectPending";
import Home from "../../components/Home";
import ErrorOutline from "@mui/icons-material/ErrorOutline";
import { useAppSelector } from "../../store/hooks";
import { CLIENT_ID } from "../config";
import isSingleFile from "../../util/isSingleFile";
import { hasRedirectedFromAuth } from "../util/parseQueryString";
import { useDbxEntries } from "../hooks/useDbxEntries";
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
      "none",
      true
    )
    .then((authUrl) => {
      // window.sessionStorage.clear(); <- doing this erases our stored 'current collection' info.
      window.sessionStorage.setItem("codeVerifier", dbxAuth.getCodeVerifier());
      window.location.href = authUrl as string;
    })
    .catch((error) => console.error(error));
}

interface AccessControlledPageProps {
  children: JSX.Element;
}

const FileSelectPendingWrapper: React.FC<{}> = (props) => {
  const { loadExistingCollection } = useDbxEntries();
  const { state } = useContext(fileSelectPendingContext);
  return (
    <>
      {state._type === "ok" ? (
        props.children
      ) : (
        <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <div>
              {state._type === "pending" ? (
                <CircularProgress size={48} />
              ) : (
                <ErrorOutline fontSize="large" color="error" />
              )}
            </div>
            <div style={{ margin: "1em" }}>
              {state._type === "pending" ? (
                <Typography>Loading Collection...</Typography>
              ) : (
                <Box>
                  <p>
                    <Typography>{state.message}</Typography>
                  </p>
                  {state.fileFailed && (
                    <Button
                      onClick={() => loadExistingCollection(state.fileFailed!)}
                    >
                      Retry?
                    </Button>
                  )}
                </Box>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const DelayDisplay: React.FC<{ when: boolean; amount: number }> = ({
  when,
  amount,
  children,
}) => {
  const [show, setShow] = React.useState(!when);

  useEffect(() => {
    if (show) {
      return; // once shown, never hide.
    }
    if (!when) {
      // no longer when we want to delay rendering. Immediately show.
      setShow(true);
      return;
    }
    if (!show) {
      const to = setTimeout(() => setShow(true), amount);
      return () => clearTimeout(to);
    }
  }, [when, show, amount]);
  if (!show) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div>
            <CircularProgress size={48} />
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const AccessControlledPage: React.FC<AccessControlledPageProps> = (props) => {
  const collection = useAppSelector((state) => state.dbx.collection);
  const auth = useAppSelector((state) => state.dbx.auth);
  const isAuthorized = auth.state === "authorized";
  const fileSelected =
    collection.state === "authorized" && Boolean(collection.selectedFilePath);

  const mergeResolvedKey = useAppSelector(
    (state) => state.merge.state === "resolved"
  );
  if (!isAuthorized && !isSingleFile()) {
    return (
      // If we redirected from the auth page, this will flash unless we deliberately hide it while loading.
      // One simple way to do this is if we detect through the URL that we are redirected, add delay before showing.
      // Inside the component it should cleanup (call clearTimeout) in the useEffect when 'when' changes, to prevent memory leak
      <DelayDisplay when={hasRedirectedFromAuth()} amount={2000}>
        <LandingPage dbxAuth={doAuth}>Authorize</LandingPage>
      </DelayDisplay>
    );
  }
  const content = (
    <FileSelectPendingWrapper key={mergeResolvedKey + ""}>
      <div style={{ height: "100%" }}>
        {fileSelected || isSingleFile() ? props.children : <Home />}
      </div>
    </FileSelectPendingWrapper>
  );

  return (
    <FileSelectPendingProvider>
      <div>
        <Layout>
          <div style={{ height: "100%" }}>
            <MergeEditorWrap>{content}</MergeEditorWrap>
          </div>
        </Layout>
      </div>
    </FileSelectPendingProvider>
  );
};
export default AccessControlledPage;
