import { Dropbox } from "dropbox";
import hash_sum from "hash-sum";
import { DrawingDocuments } from "../../Excalidraw/store/drawingsSlice";
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";
import { IndexFileStructure } from "../domain";
import { Revisions } from "../store/activeCollectionSlice";

const upload = async (
    dbx: Dropbox,
    indexFilePath: string,
    indexFileRev: string,
    documents: SlateDocuments,
    drawings: DrawingDocuments,
    existingRevisions: Revisions | undefined,
    docsPendingUpload: Set<string>,
    drawingsPendingUpload: Set<string>,
) => {
    const results = await Promise.allSettled([
      ...Array.from(docsPendingUpload).map(docKey => dbx.filesUpload({
        mode: {
          ".tag": "overwrite"
        },
        path: indexFilePath.slice(0, indexFilePath.lastIndexOf('/')) + '/' + docKey + '.json',
        contents: new File([
          JSON.stringify(documents[docKey], null, 2)
        ],
          docKey + '.json',
          {
            type: 'application/json'
          })
      })
        .then(result => {
          docsPendingUpload.delete(docKey);
          return ({ type: 'doc' as const, key: docKey, result })
        })),
      ...Array.from(drawingsPendingUpload).map(drawingKey => dbx.filesUpload({
        mode: {
          ".tag": "overwrite"
        },
        path: indexFilePath.slice(0, indexFilePath.lastIndexOf('/')) + '/' + drawingKey + '.json',
        contents: new File([
          JSON.stringify(drawings[drawingKey], null, 2)
        ],
          drawingKey + '.json',
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
    }, { documents: {}, drawings: {} } as IndexFileStructure)

    const indexFile: IndexFileStructure = {
      documents: Object.fromEntries(Object.entries(documents).map(([docName, doc]) => {
        return [docName, newIndexFileEntries.documents[docName] ?? ({ hash: hash_sum(doc), rev: existingRevisions?.documents[docName] })];
      })),
      drawings: Object.fromEntries(Object.entries(drawings).map(([drawingName, drawing]) => {
        return [drawingName, newIndexFileEntries.drawings[drawingName] ?? ({ hash: hash_sum(drawing), rev: existingRevisions?.drawings[drawingName] })];
      }))
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