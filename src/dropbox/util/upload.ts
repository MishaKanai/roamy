import { Dropbox } from "dropbox";
import hash_sum from "hash-sum";
import { DrawingDocuments } from "../../Excalidraw/store/drawingsSlice";
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";
import { UploadedFiles } from "../../UploadedFiles/uploadedFilesSlice";
import { IndexFileStructure } from "../domain";
import { Revisions } from "../store/activeCollectionSlice";
import getFilesToDrawings from "./getFilesToDrawings";

const upload = async (
    dbx: Dropbox,
    indexFilePath: string,
    indexFileRev: string,
    documents: SlateDocuments,
    drawings: DrawingDocuments,
    uploadedFiles: UploadedFiles,
    existingRevisions: Revisions | undefined,
    docsPendingUpload: Set<string>,
    drawingsPendingUpload: Set<string>,
    filesPendingUpload: Set<string>,
) => {
  const folderPath = indexFilePath.slice(0, indexFilePath.lastIndexOf('/')) + '/';
  /**
   * TODO: handle deletion! If present in pending upload and not in documents/drawings/uploadedFiles
   * delete it?
   */
    const results = await Promise.allSettled([
      ...Array.from(filesPendingUpload)
      // do 'adds' and not 'deletes' here.
      .filter(fileId => uploadedFiles[fileId])
      .map(fileId => dbx.filesUpload({
        mode: {
          ".tag": "overwrite"
        },
        path: folderPath + 'file_' + fileId + '.json',
        contents: new File([
          // save JUST the fileData, so we don't change on every backRef added/removed.
          JSON.stringify(uploadedFiles[fileId].fileData, null, 2)
        ],
          'file_' + fileId + '.json',
          {
            type: 'application/json'
          })
      })
      .then(result => {
        filesPendingUpload.delete(fileId)
        return ({ type: 'file' as const, key: fileId, result })
      })),
      ...Array.from(docsPendingUpload)
      // only adds
      .filter(docKey => documents[docKey])
      .map(docKey => dbx.filesUpload({
        mode: {
          ".tag": "overwrite"
        },
        path: folderPath + docKey + '.json',
        contents: new File([
          JSON.stringify(documents[docKey], null, 2)
        ],
          'doc_' + docKey + '.json',
          {
            type: 'application/json'
          })
      })
        .then(result => {
          docsPendingUpload.delete(docKey);
          return ({ type: 'doc' as const, key: docKey, result })
        })),
      ...Array.from(drawingsPendingUpload)
      .filter(drawingKey => drawings[drawingKey])
      .map(drawingKey => dbx.filesUpload({
        mode: {
          ".tag": "overwrite"
        },
        path: folderPath + drawingKey + '.json',
        contents: new File([
          JSON.stringify(drawings[drawingKey], null, 2)
        ],
          'drawing_' + drawingKey + '.json',
          {
            type: 'application/json'
          })
      }).then(result => {
        drawingsPendingUpload.delete(drawingKey);
        return ({ type: 'drawing' as const, key: drawingKey, result })
      }))
    ]);
    
    const newIndexFileEntries = results.reduce((prev, curr) => {
      if (curr.status === 'rejected') {
        return prev;
      }
      if (curr.value.type === 'file') {
        const fileId = curr.value.key;
        prev.uploadedFiles?.push(fileId);
      }
      if (curr.value.type === 'doc') {
        const documentKey = curr.value.key;
        prev.documents[documentKey] = {
          rev: curr.value.result.result.rev,
          hash: hash_sum(documents[documentKey])
        }
      }
      if (curr.value.type === 'drawing') {
        const drawingKey = curr.value.key;
        prev.drawings[drawingKey] = {
          rev: curr.value.result.result.rev,
          hash: hash_sum(drawings[drawingKey])
        }
      }
      return prev;
    }, { documents: {}, drawings: {}, uploadedFiles: [] } as IndexFileStructure)

    const indexFile: IndexFileStructure = {
      documents: Object.fromEntries(Object.entries(documents).map(([docName, doc]) => {
        return [docName, newIndexFileEntries.documents[docName] ?? ({ hash: hash_sum(doc), rev: existingRevisions?.documents[docName] })];
      })),
      drawings: Object.fromEntries(Object.entries(drawings).map(([drawingName, drawing]) => {
        return [drawingName, newIndexFileEntries.drawings[drawingName] ?? ({ hash: hash_sum(drawing), rev: existingRevisions?.drawings[drawingName] })];
      })),
      uploadedFiles: Object.keys(getFilesToDrawings(drawings))
    }
    
    const revisions = {
        documents: Object.fromEntries(Object.entries(indexFile.documents).map(([k, doc]) => [k, doc.rev])),
        drawings: Object.fromEntries(Object.entries(indexFile.drawings).map(([k, drawing]) => [k, drawing.rev])),
    }
    return dbx
      .filesUpload({
        mode: {
          ".tag": "update",
          update: indexFileRev,
        },
        path: indexFilePath,
        contents: new File(
          [
            JSON.stringify(indexFile,
              null,
              2
            ),
          ],
          indexFilePath.slice(1),
          {
            type: "application/json",
          }
        ),
      }).then(response => ({
        response,
        revisions
      }))
  }
  export default upload;