import React, { useReducer, useMemo } from "react";
import slateDocumentsReducer, {
  SlateDocuments,
} from "../../../SlateGraph/store/slateDocumentsSlice";
import { Button, CardActions, CardContent } from "@mui/material";
import MergeDocs from "./MergeDocs";
import { useSubmitMergedDoc } from "./MergePopup";
import { combineReducers } from "redux";
import drawingsReducer, {
  DrawingDocuments,
} from "../../../Excalidraw/store/drawingsSlice";
import mergeContext from "../mergeContext";
import attemptMerge from "../util/attemptMerge";
import MergeDrawings from "./MergeDrawings";
import { UploadedFiles } from "../../../UploadedFiles/uploadedFilesSlice";
import MergeTitle from "./MergeTitle";

const mergeReducer = combineReducers({
  documents: slateDocumentsReducer,
  drawings: drawingsReducer,
});

const ResolveConflicts: React.FC<{
  initial: SlateDocuments;
  left: SlateDocuments;
  right: SlateDocuments;
  remoteRev: string;
  initialDrawings: DrawingDocuments;
  leftDrawings: DrawingDocuments;
  rightDrawings: DrawingDocuments;
  combinedFiles: UploadedFiles;
}> = ({
  left,
  right,
  remoteRev,
  initial,
  initialDrawings,
  leftDrawings,
  rightDrawings,
  combinedFiles,
}) => {
  const submitMerge = useSubmitMergedDoc();
  const [initialState, docsNeedingMerge, drawingsNeedingMerge] = useMemo((): [
    ReturnType<typeof mergeReducer>,
    string[],
    string[]
  ] => {
    return attemptMerge({
      documents: {
        left,
        initial,
        right,
      },
      drawings: {
        left: leftDrawings,
        right: rightDrawings,
        initial: initialDrawings,
      },
    });
  }, [left, initial, right, initialDrawings, leftDrawings, rightDrawings]);
  const [mergedState, dispatch] = useReducer(mergeReducer, initialState);
  // const [mergedDocuments, setMergedDocuments] = useState<SlateDocuments>(left)
  const providerValue = useMemo(
    () => ({ inMergeContext: true, dispatch }),
    [dispatch]
  );
  return (
    <mergeContext.Provider value={providerValue}>
      <div>
        <CardContent>
          {docsNeedingMerge.map((docKey) => {
            const docLeft = left[docKey];
            const docRight = right[docKey];
            return (
              <div key={docKey}>
                <MergeTitle
                  left={docLeft.displayName ?? ""}
                  right={docRight.displayName ?? ""}
                  curr={mergedState.documents[docKey].displayName ?? ""}
                  docName={docKey}
                />
                <MergeDocs
                  curr={mergedState.documents[docKey].document}
                  docName={docKey}
                  left={docLeft.document}
                  right={docRight.document}
                />
              </div>
            );
          })}
          {drawingsNeedingMerge.map((drawingKey) => {
            const drawingLeft = leftDrawings[drawingKey]?.drawing;
            const drawingRight = rightDrawings[drawingKey]?.drawing;
            return (
              <div key={drawingKey}>
                <MergeDrawings
                  drawingName={drawingKey}
                  allFiles={combinedFiles}
                  curr={mergedState.drawings[drawingKey].drawing}
                  left={drawingLeft}
                  right={drawingRight}
                />
              </div>
            );
          })}
        </CardContent>
        <CardActions>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              submitMerge(
                mergedState.documents,
                mergedState.drawings,
                combinedFiles,
                remoteRev
              );
            }}
          >
            Submit
          </Button>
        </CardActions>
      </div>
    </mergeContext.Provider>
  );
};
export default ResolveConflicts;
