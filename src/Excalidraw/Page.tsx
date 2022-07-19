import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import {
  updateDrawing as updateDrawingAction,
} from "./store/drawingsSlice";
import { DrawingData } from "./store/domain";
import HoverBacklinks from "../components/AnchoredPopper";
import { Excalidraw } from "@excalidraw/excalidraw";
import { Resizable, ResizeCallback } from "re-resizable";
import { ExcalidrawProps } from "@excalidraw/excalidraw/types/types";
import { drawingOptionsContext } from "../extension/drawingOptionsContext";
import { useRoamyDispatch } from "../SlateGraph/Page";
import { useTheme } from "@mui/material";
import * as excalidrawRegistry from "./registry";
import uniqueId from 'lodash/uniqueId';
import { RootState } from "../store/configureStore";
import { useDrawingPage } from "./hooks/useDrawingPage";
import useExcalidrawInstance from "./hooks/useExcalidrawInstance";

interface DrawingPageProps {
  drawingName: string;
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
  excalidrawProps?: Partial<ExcalidrawProps>;
  preventScrollAndResize?: boolean;
  overrideDrawing?: DrawingData;
}

const resizableStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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
    const { excalidrawInstance, excalidrawRef } = useExcalidrawInstance();
    const dispatch = useRoamyDispatch();
    const [_currDrawing, setDrawing, submitBufferedStateToStore] = useDrawingPage(drawingName, {
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
    }, [currDrawing.elements]);

    const registryId = useMemo(() => uniqueId(drawingName), [drawingName]);
    useEffect(() => {
      if (excalidrawInstance) {
        excalidrawRegistry.register(drawingName, registryId, excalidrawInstance);
      }
      return () => {
        excalidrawRegistry.unregister(drawingName, registryId);
      }
    }, [drawingName, registryId, excalidrawInstance])

    const isDark = useTheme().palette.mode === 'dark';
    
    const drawing = (
      <Excalidraw
        ref={excalidrawRef}
        {...excalidrawProps}
        onChange={setDrawing}
        initialData={initialData}
      />
  );

    const handleMouseUp = useCallback(() => {
      
      const appState = excalidrawInstance?.getAppState();
      // only trigger sync for mouse up from drawing
      // i.e. don't sync if there's no selected selements when we mouse up.
      if (appState && Object.keys(appState.selectedElementIds).length === 0) {
        return;
      }
      excalidrawRegistry.triggerSync(drawingName, registryId, {
        elements: excalidrawInstance?.getSceneElements(),
      });
      submitBufferedStateToStore();
    }, [drawingName, registryId, excalidrawInstance, submitBufferedStateToStore])

    const handleKeyUp = useCallback(() => {
      excalidrawRegistry.triggerSync(drawingName, registryId, {
        elements: excalidrawInstance?.getSceneElements(),
      });
      submitBufferedStateToStore();
    }, [drawingName, registryId, excalidrawInstance, submitBufferedStateToStore])

    const currHeight = currDrawing.size.height;
    const currWidth = currDrawing.size.width;
    useEffect(() => {
      setImmediate(() => {
        excalidrawInstance?.refresh();
      })
    }, [currHeight, currWidth, excalidrawInstance])
    const handleResizeStop: ResizeCallback = useCallback((e, direction, ref, d) => {
      dispatch(
        updateDrawingAction(drawingName, {
          size: {
            height: currHeight + d.height,
            width: currWidth + d.width,
          },
        })
      );
    }, [dispatch, currHeight, currWidth, drawingName])
    
    return (
      <span onKeyUp={handleKeyUp} onMouseUp={handleMouseUp} onBlur={handleKeyUp}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: viewedFromParentDoc ? -24 : -34, left: 0 }}>
            {title}
          </div>
        </div>
        <div style={Object.assign(
          { marginTop: '1.25em', paddingTop: '1em', paddingBottom: '1em' },
          isDark ? { filter: 'invert(100%) hue-rotate(180deg)' } : {})}>
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
              className="roamy-view-excal"
              style={{
                height: currDrawing.size.height,
                width: currDrawing.size.width,
              }}
            >
              {drawing}
            </div>
          ) : (
            <Resizable
              style={resizableStyle}
              size={currDrawing.size}
              onResizeStop={handleResizeStop}
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
