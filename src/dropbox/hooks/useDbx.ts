import { Dropbox } from "dropbox";
import { useAppSelector } from "../../store/hooks";
import getDbx from "../singletons/getDbx";

const useDbx = (): Dropbox | null => {
  const refreshToken = useAppSelector(
    state =>
      state.dbx.auth.state === "authorized" && state.dbx.auth.refreshToken
  );
  if (!refreshToken) {
    return null;
  }
  return getDbx(refreshToken);
}
export default useDbx