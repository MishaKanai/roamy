import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { RootState } from "../store/createRootReducer";
import {
  createDrawingAction,
  deleteDrawingAction,
  updateDrawingAction,
} from "./store/actions";
import { DrawingData } from "./store/domain";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../components/AnchoredPopper";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import Draw from "@excalidraw/excalidraw";
import { Resizable } from "re-resizable";

interface DrawingPageProps {
  drawingName: string;
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
}

const INITIAL_HEIGHT = 400;
const INITIAL_WIDTH = 400;
const createInitialEmptyDrawing = (): DrawingData => ({
  size: {
    height: INITIAL_HEIGHT,
    width: INITIAL_WIDTH,
  },
  elements: [],
});

const DrawingPage: React.FC<DrawingPageProps> = React.memo(
  ({ drawingName, viewedFromParentDoc, title }) => {
    const initialDrawing: DrawingData = useMemo(createInitialEmptyDrawing, []);
    const currDrawing = useSelector(
      (state: RootState) =>
        state.drawings[drawingName]?.drawing ?? initialDrawing
    );
    const hasBackReferences = useSelector((state: RootState) =>
      Boolean(state.drawings[drawingName]?.backReferences?.length)
    );
    const hasBackReferencesRef = useRef(hasBackReferences);
    hasBackReferencesRef.current = hasBackReferences;
    const currDocRef = useRef(currDrawing);
    currDocRef.current = currDrawing; // always have a ref to the current doc- this lets us check it on cleanup to see if doc is nonempty
    // if not, we can safely delete on unmount.

    const dispatch = useDispatch();

    useEffect(() => {
      if (currDrawing === initialDrawing) {
        dispatch(
          createDrawingAction(
            drawingName,
            currDrawing,
            viewedFromParentDoc
              ? { withBackref: viewedFromParentDoc }
              : undefined
          )
        );
      }
      return () => {
        if (
          deepEqual(
            currDocRef.current,
            createInitialEmptyDrawing() && !hasBackReferencesRef.current
          )
        ) {
          dispatch(deleteDrawingAction(drawingName));
        }
      };
    }, []); // eslint-disable-line

    const setDrawing = useCallback(
      (newDrawingElements: readonly ExcalidrawElement[]) => {
        dispatch(
          updateDrawingAction(drawingName, {
            elements: newDrawingElements as ExcalidrawElement[],
          })
        );
      },
      [drawingName, dispatch]
    );

    return (
      <div style={{ margin: ".5em", marginTop: 0 }}>
        <div>
          <Resizable
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "solid 1px #ddd",
              background: "#f0f0f0",
            }}
            size={currDrawing.size}
            onResizeStop={(e, direction, ref, d) => {
              dispatch(
                updateDrawingAction(drawingName, {
                  size: {
                    height: currDrawing.size.height + d.height,
                    width: currDrawing.size.width + d.width,
                  },
                })
              );
            }}
          >
            <Draw onChange={setDrawing} initialData={currDrawing} />
          </Resizable>
        </div>
        {/* backReferenceLinks && backReferenceLinks.length > 0 ? (
          <ul>{backReferenceLinks}</ul>
        ) : null */}
        {/* <SlateGraphEditor
          title={title}
          createDoc={createChildDoc}
          value={currDoc}
          setValue={setDoc}
          docName={docName}
        /> */}
      </div>
    );
  }
);

// this is basically a duplicate of DocumentPage
export const DrawingPageRoute = React.memo(() => {
  let { drawingName } = useParams<{ drawingName: string }>();
  const selectBacklinks = useCallback(
    (state: RootState) => state.drawings[drawingName]?.backReferences,
    [drawingName]
  );
  const title = (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <b style={{ fontSize: "x-large", marginBottom: 0 }}>{drawingName}</b>
      &nbsp;
      <span style={{ position: "relative" }}>
        <span style={{ position: "absolute", bottom: 0, whiteSpace: "nowrap" }}>
          <HoverBacklinks key={drawingName} selectBacklinks={selectBacklinks} />
        </span>
      </span>
    </div>
  );
  return (
    <div style={{ margin: ".5em" }}>
      <DrawingPage title={title} key={drawingName} drawingName={drawingName} />
    </div>
  );
});

export default DrawingPage;
