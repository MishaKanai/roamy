import { useSelector } from "react-redux";
import { RootState } from "../../store/createRootReducer";

const useFileSelected = () => {
    return useSelector((state: RootState) => state.dbx.collection?.state === 'authorized' ? state.dbx.collection.selectedFilePath : null);
}
export default useFileSelected