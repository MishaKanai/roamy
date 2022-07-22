import { useMemo } from "react";
import { useAppSelector } from "../../store/hooks";
import createFilesForDrawingSelector from "../../UploadedFiles/filesForDrawingSelector";

const useFiles = (drawingName: string) => {
    const filesSelector = useMemo(createFilesForDrawingSelector, []);
    const files = useAppSelector(state => filesSelector(state, drawingName));
    return files;
}
export default useFiles;