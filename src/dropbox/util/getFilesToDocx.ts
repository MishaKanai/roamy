import { traverseTransformNodes } from "../../Autocomplete/Editor/utils/traverseTransformNodes";
import { CustomElement } from "../../SlateGraph/slate";
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";

const getFilesToDocs = (docs: SlateDocuments) => {
    let filesToDocs: {
        [fileId: string]: string[]
    } = {

    }
    Object.entries(docs).forEach(([docKey, doc]) => {
        traverseTransformNodes(_node => {
            const node: CustomElement = _node as any;
            if (node.type === 'image' && node.imageId) {
                if (!filesToDocs[node.imageId]) {
                    filesToDocs[node.imageId] = []
                }
                filesToDocs[node.imageId].push(docKey)
            }
            return null;
        })(doc.document);
    });
    return filesToDocs;
}
export default getFilesToDocs;