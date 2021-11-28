import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";

const useFileSelected = () => {
    const auth = useSelector((state: RootState) => state.auth);
    if (auth.state === 'authorized') {
        return auth.selectedFilePath;
    }
    return null;
}
export default useFileSelected