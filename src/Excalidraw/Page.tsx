import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSelector } from "react-redux";
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
import { AppState, ExcalidrawProps } from "@excalidraw/excalidraw/types/types";
import { drawingOptionsContext } from "../extension/drawingOptionsContext";
import equal from "fast-deep-equal";
import { useRoamyDispatch } from "../SlateGraph/Page";
import { useTheme } from "@mui/material";

interface DrawingPageProps {
  drawingName: string;
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
  excalidrawProps?: Partial<ExcalidrawProps>;
  preventScrollAndResize?: boolean;
  overrideDrawing?: DrawingData;
}

const INITIAL_HEIGHT = 400;
const INITIAL_WIDTH = 600;
const createInitialEmptyDrawing = (): DrawingData => ({
  size: {
    height: INITIAL_HEIGHT,
    width: INITIAL_WIDTH,
  },
  elements: [],
});

export const useDrawingPage = (
  drawingName: string,
  options?: {
    viewedFromParentDoc?: string;
  }
) => {
  const viewedFromParentDoc = options?.viewedFromParentDoc;
  const initialDrawing: DrawingData = useMemo(createInitialEmptyDrawing, []);
  const currDrawing = useSelector(
    (state: RootState) => state.drawings[drawingName]?.drawing ?? initialDrawing
  );
  const hasBackReferences = useSelector((state: RootState) =>
    Boolean(state.drawings[drawingName]?.backReferences?.length)
  );
  const hasBackReferencesRef = useRef(hasBackReferences);
  hasBackReferencesRef.current = hasBackReferences;
  const currDocRef = useRef(currDrawing);
  currDocRef.current = currDrawing; // always have a ref to the current doc- this lets us check it on cleanup to see if doc is nonempty
  // if not, we can safely delete on unmount.

  const dispatch = useRoamyDispatch();

  useEffect(() => {
    if (currDrawing === initialDrawing) {
      dispatch(
        createDrawingAction(
          drawingName,
          currDrawing,
          viewedFromParentDoc ? { withBackref: viewedFromParentDoc } : undefined
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

  const someRealChangeToDrawing_Ref = useRef(false);
  const setDrawing = useCallback(
    (newDrawingElements: readonly ExcalidrawElement[], appState: AppState) => {
      if (
        // prevent updateDrawing on initial load.
        !someRealChangeToDrawing_Ref.current &&
        equal(newDrawingElements, currDocRef.current.elements)
        // the deep equality check here isn't necessary if we only update according to the change
        // of document hashes, instead of shallow-equal check to determine if 'drawings' store was updated
      ) {
        return;
      }
      someRealChangeToDrawing_Ref.current = true;

      dispatch(
        updateDrawingAction(drawingName, {
          elements: newDrawingElements as ExcalidrawElement[],
        })
      );
    },
    [drawingName, dispatch]
  );
  return [currDrawing, setDrawing] as [typeof currDrawing, typeof setDrawing];
};

const DrawingPage: React.FC<DrawingPageProps> = React.memo(
  ({
    drawingName,
    viewedFromParentDoc,
    title,
    excalidrawProps,
    preventScrollAndResize = false,
    overrideDrawing
  }) => {
    const dispatch = useRoamyDispatch();
    const [_currDrawing, setDrawing] = useDrawingPage(drawingName, {
      viewedFromParentDoc,
    });
    const currDrawing = overrideDrawing ?? _currDrawing;
    const initialData = useMemo(() => {
      return {
        elements: currDrawing.elements,
        appState: {
          viewBackgroundColor: "transparent",
        },
      };
    }, /* [stableStringify(currDrawing.elements)] */[currDrawing.elements]);
    const isDark = useTheme().palette.mode === 'dark';
    const drawing = (
      <Draw
        {...excalidrawProps}
        onChange={setDrawing}
        initialData={initialData}
      />
    );

    useEffect(() => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 0)
    }, [preventScrollAndResize])

    const [shown, setShown] = useState(false)
    useEffect(() => {
      const to = setTimeout(() => {
          setShown(true)
      }, 100);
      return () => {
        clearTimeout(to);
      }
    }, [])
    return (
      <span style={shown ? undefined : { visibility: 'hidden' }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: viewedFromParentDoc ? -24 : -34, left: 0 }}>
            {title}
          </div>
        </div>
        <div style={Object.assign({ marginTop: '1.25em', paddingTop: '1em', paddingBottom: '1em' }, isDark ? { filter: 'invert(100%) hue-rotate(180deg)' } : {}, viewedFromParentDoc ? {
          overflowX: 'auto',
        } as const : {})}>
          <div style={{ position: "relative" }}>
            {preventScrollAndResize && (
              // a perfect overlay of the drawing area
              <div
                style={{
                  zIndex: 500,
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: currDrawing.size.height,
                  width: currDrawing.size.width,
                }}
              />
            )}
          </div>
          {preventScrollAndResize ? (
            <div
              style={{
                height: currDrawing.size.height,
                width: currDrawing.size.width,
              }}
            >
              {drawing}
            </div>
          ) : (
            <Resizable
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
              {drawing}
            </Resizable>
          )}
        </div>
      </span>
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

  const { renderDrawingOptions } = useContext(drawingOptionsContext);
  const title = (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <b style={{ fontSize: "x-large", marginBottom: 0 }}>{drawingName}</b>
      &nbsp;
      {renderDrawingOptions?.({ drawingId: drawingName })}
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
      <DrawingPage
        excalidrawProps={{
          gridModeEnabled: true,
          zenModeEnabled: true,
        }}
        title={title}
        key={drawingName}
        drawingName={drawingName}
      />
    </div>
  );
});

export default DrawingPage;
