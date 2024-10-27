import React, { useCallback, useContext, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { updateDrawing as updateDrawingAction } from "./store/globalActions";
import { DrawingData } from "./store/domain";
import HoverBacklinks from "../components/AnchoredPopper";
import { Excalidraw } from "@excalidraw/excalidraw";
import { Resizable, ResizeCallback } from "re-resizable";
import {
  BinaryFiles,
  ExcalidrawProps,
} from "@excalidraw/excalidraw/types/types";
import { drawingOptionsContext } from "../extension/drawingOptionsContext";
import { useRoamyDispatch } from "../SlateGraph/Page";
import { useTheme } from "@mui/material";
import * as excalidrawRegistry from "./registry";
import uniqueId from "lodash/uniqueId";
import { RootState } from "../store/configureStore";
import { useDrawingPage } from "./hooks/useDrawingPage";
import useExcalidrawInstance from "./hooks/useExcalidrawInstance";
import ExcalidrawSvgImage from "./ExcalidrawSvgImage";
import useFiles from "./hooks/useFiles";
import { THEME } from "@excalidraw/excalidraw";
import DocTitle from "../components/EditableTitle";
import isSingleFile from "../util/isSingleFile";

interface DrawingPageProps {
  drawingName: string;
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
  excalidrawProps?: Partial<ExcalidrawProps>;
  preventScrollAndResize?: boolean;
  overrideDrawing?: DrawingData;
  overrideFiles?: BinaryFiles;
  asSvg?: boolean;
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
    overrideDrawing,
    overrideFiles,
    asSvg = isSingleFile(),
  }) => {
    const { excalidrawInstance, excalidrawRef } = useExcalidrawInstance();
    const dispatch = useRoamyDispatch();
    const [_currDrawing, setDrawing, submitBufferedStateToStore] =
      useDrawingPage(drawingName, {
        viewedFromParentDoc,
      });
    const currDrawing = overrideDrawing ?? _currDrawing;
    const _files = useFiles(drawingName);
    const files = overrideFiles ?? _files;

    const isDark = useTheme().palette.mode === "dark";

    const initialData = useMemo(() => {
      return {
        elements: currDrawing.elements,
        files,
        appState: {
          viewBackgroundColor: "transparent",
          theme: isDark ? THEME.DARK : THEME.LIGHT,
        },
      };
    }, [currDrawing.elements, files, isDark]);

    const registryId = useMemo(() => uniqueId(drawingName), [drawingName]);
    useEffect(() => {
      if (excalidrawInstance) {
        excalidrawRegistry.register(
          drawingName,
          registryId,
          excalidrawInstance
        );
      }
      return () => {
        excalidrawRegistry.unregister(drawingName, registryId);
      };
    }, [drawingName, registryId, excalidrawInstance]);

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
    }, [
      drawingName,
      registryId,
      excalidrawInstance,
      submitBufferedStateToStore,
    ]);

    const handleKeyUp = useCallback(() => {
      excalidrawRegistry.triggerSync(drawingName, registryId, {
        elements: excalidrawInstance?.getSceneElements(),
      });
      submitBufferedStateToStore();
    }, [
      drawingName,
      registryId,
      excalidrawInstance,
      submitBufferedStateToStore,
    ]);

    const currHeight = currDrawing.size.height;
    const currWidth = currDrawing.size.width;
    useEffect(() => {
      setImmediate(() => {
        excalidrawInstance?.refresh();
      });
    }, [currHeight, currWidth, excalidrawInstance]);
    const handleResizeStop: ResizeCallback = useCallback(
      (e, direction, ref, d) => {
        dispatch(
          updateDrawingAction(drawingName, {
            size: {
              height: currHeight + d.height,
              width: currWidth + d.width,
            },
          })
        );
      },
      [dispatch, currHeight, currWidth, drawingName]
    );
    return (
      <>
        {asSvg ? (
          <div>
            <div>{title}</div>
            <ExcalidrawSvgImage
              width={"min(" + currDrawing.size.width + "px, calc(100% - 2em))"}
              drawingName={drawingName}
            />
          </div>
        ) : null}
        <span
          style={asSvg ? { display: "none" } : undefined}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onBlur={handleKeyUp}
        >
          <div
            style={{
              position: "relative",
              paddingTop: viewedFromParentDoc ? undefined : "1em",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: viewedFromParentDoc ? -24 : -34,
                left: 0,
              }}
            >
              {title}
            </div>
          </div>
          <div
            style={{
              marginTop: "1.25em",
              paddingTop: "1em",
              paddingBottom: "1em",
            }}
          >
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
      </>
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
    <div style={{ display: "flex", flexDirection: "column" }}>
      <b style={{ fontSize: "x-large", marginBottom: 0 }}>
        <DocTitle id={drawingName} type="drawings" editable />
      </b>
      {renderDrawingOptions?.({ drawingId: drawingName })}
      <HoverBacklinks key={drawingName} selectBacklinks={selectBacklinks} />
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
