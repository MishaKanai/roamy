import { DropboxAuth } from "dropbox"

const CLIENT_ID = "24bu717gh43au0o";

let dropboxAuth: DropboxAuth;
const getDropboxAuth = () => {
    if (!dropboxAuth) {
        dropboxAuth = new DropboxAuth({
            clientId: CLIENT_ID
        })
    }
    return dropboxAuth;
}
export default getDropboxAuth;