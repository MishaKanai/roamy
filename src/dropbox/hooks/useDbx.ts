import { Dropbox } from "dropbox";
import { useAppSelector } from "../../store/hooks";
import getDbx from "../singletons/getDbx";
import TokenManager from "../util/storage";

const useDbx = (): Dropbox | null => {
  const isAuthorized = useAppSelector(
    (state) => state.dbx.auth.state === "authorized"
  );
  const refreshToken =
    isAuthorized &&
    (() => {
      const tokens = TokenManager.getTokens();
      return tokens.present && tokens.refreshToken;
    })();
  if (!refreshToken) {
    return null;
  }
  return getDbx(refreshToken);
};
export default useDbx;
