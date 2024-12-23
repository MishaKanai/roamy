import { Dropbox } from "dropbox";
import hash_sum from "hash-sum";
import uniq from "lodash/uniq";
import { DrawingDocuments } from "../../Excalidraw/store/drawingsSlice";
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";
import { UploadedFiles } from "../../UploadedFiles/uploadedFilesSlice";
import { IndexFileStructure } from "../domain";
import { Revisions } from "../store/activeCollectionSlice";
import getFilesToDocs from "./getFilesToDocx";
import getFilesToDrawings from "./getFilesToDrawings";
import { Categories } from "../../Category/store/categoriesSlice";
import { UploadTracker } from "../../store/util/UploadTracker";
import { retryWithBackoff } from "./retryWithBackoffAndBottleneck";

const getFileFileName = (fileId: string) => "file_" + fileId + ".json";
const getDocFileName = (docId: string) => "doc_" + docId + ".json";
const getDrawingFileName = (drawingId: string) =>
  "drawing_" + drawingId + ".json";

const upload = async (
  dbx: Dropbox,
  indexFilePath: string,
  indexFileRev: string,
  documents: SlateDocuments,
  drawings: DrawingDocuments,
  uploadedFiles: UploadedFiles,
  existingRevisions: Revisions | undefined,
  docsPendingUpload: UploadTracker,
  drawingsPendingUpload: UploadTracker,
  filesPendingUpload: Set<string>,
  remoteFilesPendingDelete: Set<string>,
  categories: Categories
) => {
  const folderPath =
    indexFilePath.slice(0, indexFilePath.lastIndexOf("/")) + "/";

  const toDeleteAfterSuccess = {
    files: Array.from(filesPendingUpload).filter(
      (fileId) => !uploadedFiles[fileId]
    ),
    // possibly add others later
  };

  const docsPendingUploadSnapshot = docsPendingUpload.createSnapshot();
  const drawingsPendingUploadSnapshot = docsPendingUpload.createSnapshot();

  const results = await Promise.allSettled([
    ...Array.from(filesPendingUpload)
      // do 'adds' and not 'deletes' here.
      .filter((fileId) => uploadedFiles[fileId])
      .map((fileId) =>
        retryWithBackoff(() =>
          dbx.filesUpload({
            mode: {
              ".tag": "overwrite",
            },
            path: folderPath + getFileFileName(fileId),
            contents: new File(
              [
                // save JUST the fileData, so we don't change on every backRef added/removed.
                JSON.stringify(uploadedFiles[fileId].fileData, null, 2),
              ],
              getFileFileName(fileId),
              {
                type: "application/json",
              }
            ),
          })
        ).then((result) => {
          filesPendingUpload.delete(fileId);
          return { type: "file" as const, key: fileId, result };
        })
      ),
    ...docsPendingUpload.getAllPendingKeys()
      // only adds
      .filter((docKey) => documents[docKey])
      .map((docKey) =>
        retryWithBackoff(() =>
          dbx.filesUpload({
            mode: {
              ".tag": "overwrite",
            },
            path: folderPath + getDocFileName(docKey),
            contents: new File(
              [JSON.stringify(documents[docKey], null, 2)],
              getDocFileName(docKey),
              {
                type: "application/json",
              }
            ),
          }))
          .then((result) => {
            docsPendingUpload.clearUploaded(docsPendingUploadSnapshot);
            return { type: "doc" as const, key: docKey, result };
          })
      ),
    ...drawingsPendingUpload.getAllPendingKeys()
      .filter((drawingKey) => drawings[drawingKey])
      .map((drawingKey) =>
        retryWithBackoff(() =>
          dbx.filesUpload({
            mode: {
              ".tag": "overwrite",
            },
            path: folderPath + getDrawingFileName(drawingKey),
            contents: new File(
              [JSON.stringify(drawings[drawingKey], null, 2)],
              getDrawingFileName(drawingKey),
              {
                type: "application/json",
              }
            ),
          }))
          .then((result) => {
            drawingsPendingUpload.clearUploaded(drawingsPendingUploadSnapshot)
            return { type: "drawing" as const, key: drawingKey, result };
          })
      ),
  ]);

  const newIndexFileEntries = results.reduce(
    (prev, curr) => {
      if (curr.status === "rejected") {
        return prev;
      }
      if (curr.value.type === "file") {
        const fileId = curr.value.key;
        prev.uploadedFiles?.push(fileId);
      }
      if (curr.value.type === "doc") {
        const documentKey = curr.value.key;
        prev.documents[documentKey] = {
          rev: curr.value.result.result.rev,
          hash: hash_sum(documents[documentKey]),
        };
      }
      if (curr.value.type === "drawing") {
        const drawingKey = curr.value.key;
        prev.drawings[drawingKey] = {
          rev: curr.value.result.result.rev,
          hash: hash_sum(drawings[drawingKey]),
        };
      }
      return prev;
    },
    {
      documents: {},
      drawings: {},
      uploadedFiles: [],
    } as IndexFileStructure
  );

  const indexFile: IndexFileStructure = {
    documents: Object.fromEntries(
      Object.entries(documents).map(([docName, doc]) => {
        return [
          docName,
          newIndexFileEntries.documents[docName] ?? {
            hash: hash_sum(doc),
            rev: existingRevisions?.documents[docName],
          },
        ];
      })
    ),
    drawings: Object.fromEntries(
      Object.entries(drawings).map(([drawingName, drawing]) => {
        return [
          drawingName,
          newIndexFileEntries.drawings[drawingName] ?? {
            hash: hash_sum(drawing),
            rev: existingRevisions?.drawings[drawingName],
          },
        ];
      })
    ),
    uploadedFiles: uniq([
      ...Object.keys(getFilesToDrawings(drawings)),
      ...Object.keys(getFilesToDocs(documents)),
    ]),
    categories,
  };

  const revisions = {
    documents: Object.fromEntries(
      Object.entries(indexFile.documents).map(([k, doc]) => [k, doc.rev])
    ),
    drawings: Object.fromEntries(
      Object.entries(indexFile.drawings).map(([k, drawing]) => [k, drawing.rev])
    ),
  };

  return retryWithBackoff(() =>
    dbx.filesUpload({
      mode: {
        ".tag": "update",
        update: indexFileRev,
      },
      path: indexFilePath,
      contents: new File(
        [JSON.stringify(indexFile, null, 2)],
        indexFilePath.slice(1),
        {
          type: "application/json",
        }
      ),
    })
  )
    .then((response) => ({
      response,
      revisions,
    }))
    .then(async (r) => {
      const { files } = toDeleteAfterSuccess;
      // we delete after successfully saving all the rest, so we don't have to undo deletion due to a merge error.
      let deletionResults = await Promise.allSettled([
        ...files.map((fileId) =>
          retryWithBackoff(() =>dbx.filesDeleteV2({ path: folderPath + getFileFileName(fileId) }))
        ),
        ...Array.from(remoteFilesPendingDelete).map((fileId) =>
          retryWithBackoff(() => dbx.filesDeleteV2({ path: folderPath + fileId }))
        ),
      ]);

      deletionResults.forEach((r) => {
        if (r.status === "rejected") {
          console.error("deletion failed: error below");
          console.error(r.reason);
        }
      });
      return r;
    });
};
export default upload;
