import React, { useState, useEffect, useMemo } from "react";
import { dialogController } from "./Controller";
import { Dialog } from "@mui/material";
import CompressProgress from "../CompressProgress";
import { getVideoMetadata, useVideoMetadata } from "../getVideoMetadata";

const toHHMMSS = (seconds: number) =>
  new Date(1000 * seconds).toISOString().substring(11, 19);

type State =
  | {
      open: false;
    }
  | {
      open: true;
      file: File;
      ifNo: () => void;
      onTranscoded: (b64: string) => void;
      transcode: "asking" | "yes"; // no is actually closing the dialog
    };
const CompressFileDialog = () => {
  const [state, setState] = useState<State>({ open: false });

  useEffect(() => {
    const unsubscribe = dialogController.subscribe((message) => {
      if (message.type === "open") {
        setState({
          open: true,
          ...message.payload,
          transcode: "asking",
        });
      } else if (message.type === "close") {
        setState({
          open: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const videoMeta = useVideoMetadata(state.open ? state.file : null);

  if (!state.open) return null;

  return (
    <Dialog open>
      {/* message */}
      {state.transcode === "asking" ? (
        <div>
          <p>Name: {state.file.name}</p>
          <p>
            Resolution: {videoMeta?.videoWidth} x {videoMeta?.videoHeight}
          </p>
          <p>Length: {videoMeta?.duration && toHHMMSS(videoMeta.duration)}</p>
          <p>
            Transcode to 720p before uploading?{" "}
            <button
              onClick={() => {
                setState((state) => ({
                  ...state,
                  transcode: "yes",
                }));
              }}
            >
              Transcode
            </button>
            <button
              onClick={() => {
                state.ifNo();
                dialogController.close();
              }}
            >
              Upload as-is
            </button>
            <button onClick={() => dialogController.close()}>Cancel</button>
          </p>
        </div>
      ) : (
        <CompressProgress
          onTranscoded={(b64) => {
            state.onTranscoded(b64);
            setTimeout(
              () =>
                setState({
                  open: false,
                }),
              500
            );
          }}
          file={state.file}
        />
      )}
      {/* Add progress, and 'transcode' action from ffmpeg store, if 'compress' is clicked */}
      {/* (probably should be another component that loads lazily if 'compress' is selected.) */}
      {/* <button onClick={() => dialogController.close()}>Close</button> */}
    </Dialog>
  );
};
export default CompressFileDialog;
