import { Dropbox } from "dropbox";
import getDropboxAuth from "./getDropboxAuth";

let dbx: Dropbox | null = null;
const getDbx = (refreshToken: string) => {
    const auth = getDropboxAuth();
    if (!dbx) {
        dbx = new Dropbox({ auth })
    }
    if (auth.getRefreshToken() !== refreshToken) {
        auth.setRefreshToken(refreshToken);
    }
    return dbx;
}
export default getDbx;