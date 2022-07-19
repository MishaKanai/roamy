import { DropboxAuth } from "dropbox"
import { CLIENT_ID } from "../config";

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