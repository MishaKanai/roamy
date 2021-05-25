import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";
import { DropboxAuth } from "dropbox";
import PickDbxFile from "./PickFile";

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
  if (!fileSelected) {
    return (
      <div>
        <PickDbxFile />
      </div>
    );
  }
  return <div>{props.children}</div>;
};
export default AccessControlledPage;
