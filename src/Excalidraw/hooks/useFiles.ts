import { useCallback, useMemo } from "react";
import { useAppSelector } from "../../store/hooks";
import createFilesForDrawingSelector from "../../UploadedFiles/filesForDrawingSelector";
import { UploadedFiles } from "../../UploadedFiles/uploadedFilesSlice";
import { DrawingDataInStore } from "../store/domain";

export const useFilesSelector = (drawingName: string) => {
    const filesSelector = useMemo(createFilesForDrawingSelector, []);
    return useCallback((state: {
        uploadedFiles: UploadedFiles;
        drawings: {
            [drawingName: string]: {
                drawing: DrawingDataInStore
            }
        };
    }) => filesSelector(state, drawingName), [drawingName, filesSelector]);
}
const useFiles = (drawingName: string) => {
    const filesSelector = useFilesSelector(drawingName);
    const files = useAppSelector(filesSelector);
    return files;
}
export default useFiles;