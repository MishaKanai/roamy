import { useAppSelector } from "../../store/hooks";

const useFileSelected = () => {
    return useAppSelector(state => state.dbx.collection?.state === 'authorized' ? state.dbx.collection.selectedFilePath : null);
}
export default useFileSelected