import { RemoteFiles } from "../../RemoteFiles/remoteFilesSlice";
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";
import { addRemoteFileCount, getRemoteFilesFromNodes } from "../../SlateGraph/store/util/getReferencesFromNodes";

const getFileCounts = (docs: SlateDocuments): RemoteFiles => {
    let acc: RemoteFiles = {}
    Object.values(docs).forEach(d => {
        const remoteFiles = getRemoteFilesFromNodes(d.document)
        Object.entries(remoteFiles).forEach(([fileIdentifier, { count }]) => {
            addRemoteFileCount(acc, fileIdentifier, count);
        })
    })
    return acc;
}
export default getFileCounts;