import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";

const useFileSelected = () => {
    return useSelector((state: RootState) => state.auth?.state === 'authorized' ? state.auth.selectedFilePath : null);
}
export default useFileSelected