import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { Dropbox } from "dropbox";
import { DrawingDocument, DrawingDocuments } from "../../Excalidraw/store/drawingsSlice";
import { SlateDocument, SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";
import { UploadedFiles } from "../../UploadedFiles/uploadedFilesSlice";
import { IndexFileStructure } from "../domain";
import { Revisions } from "../store/activeCollectionSlice";
import getFilesToDrawings from "./getFilesToDrawings";
import loadFileJSON from "./loadFileJSON";


const fetchDataFromCollectionAndCompose = async (dbx: Dropbox, indexFilePath: string, indexFileRevision?: string) => {
    const { data, rev } = await loadFileJSON<IndexFileStructure>(dbx, indexFilePath, indexFileRevision);
    const documentFileNames = Object.keys(data.documents);
    const drawingFileNames = Object.keys(data.drawings);
    const folderName = indexFilePath.slice(0, 'index.json'.length * -1);
    const documentResults = await Promise.allSettled([
        ...data.uploadedFiles?.map(fid => loadFileJSON<BinaryFileData>(dbx, folderName + 'file_' + fid + '.json').then(res => ({
            ...res,
            type: 'file' as const
        }))) ?? [],
        ...documentFileNames.map(dfn => loadFileJSON<SlateDocument>(dbx, folderName + 'doc_' + dfn + '.json', data.documents[dfn].rev).then(res => ({
            ...res,
            type: 'doc' as const
        }))),
        ...drawingFileNames.map(dfn => loadFileJSON<DrawingDocument>(dbx, folderName + 'drawing_' + dfn + '.json', data.drawings[dfn].rev).then(res => ({
            ...res,
            type: 'drawing' as const
        }))),
    ])
    const documents: SlateDocuments = {};
    const drawings: DrawingDocuments = {};
    const uploadedFiles: UploadedFiles = {};
    const revisions: Revisions = {
        documents: {},
        drawings: {},
    }
    documentResults.forEach(r => {
        if (r.status === 'rejected') {
            throw new Error(r.reason);
        }
        const { value } = r
        if (value.type === 'file') {
            uploadedFiles[value.data.id] = {
                fileData: value.data,
                drawingBackrefs: [] // fill this in later.
            }
        } else if (value.type === 'doc') {
            documents[value.data.name] = value.data;
            revisions.documents[value.data.name] = value.rev;
        } else {
            drawings[value.data.name] = value.data;
            revisions.drawings[value.data.name] = value.rev;
        }
    })
    const drawingsToFilesInvertedIndex = getFilesToDrawings(drawings);

    Object.values(uploadedFiles).forEach(uf => {
        uf.drawingBackrefs = drawingsToFilesInvertedIndex[uf.fileData.id] ?? []
    })
    
    return {
        indexFile: data, 
        documents,
        drawings,
        uploadedFiles,
        rev,
        revisions
    }
}
export default fetchDataFromCollectionAndCompose;