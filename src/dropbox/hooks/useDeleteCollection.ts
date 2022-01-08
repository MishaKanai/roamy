import { files } from "dropbox";
import { useCallback } from "react";
import useDbx from "./useDbx";

const useDeleteCollection = () => {
    const dbx = useDbx();
    const deleteCollection = useCallback((filename: string, onSuccess: () => void, onError: (err: files.DeleteError) => void) => {
        return dbx?.filesDeleteV2({ path: filename }).then(() => onSuccess()).catch(onError);
    }, [dbx])
    return deleteCollection;
}
export default useDeleteCollection;