import { Dropbox } from "dropbox";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";
import getDbx from "../singletons/getDbx";

const useDbx = (): Dropbox | null => {
  const refreshToken = useSelector(
    (state: RootState) =>
      state.dbx.auth.state === "authorized" && state.dbx.auth.refreshToken
  );
  if (!refreshToken) {
    return null;
  }
  return getDbx(refreshToken);
}
export default useDbx