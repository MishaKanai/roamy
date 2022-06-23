import { Dropbox } from "dropbox";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";

const useDbx = () => {
    const accessToken = useSelector(
        (state: RootState) =>
          state.dbx.auth.state === "authorized" && state.dbx.auth.accessToken
      );
      const dbx = useMemo(() => {
        return accessToken ? new Dropbox({ accessToken }) : null;
      }, [accessToken]);
      return dbx;
}
export default useDbx