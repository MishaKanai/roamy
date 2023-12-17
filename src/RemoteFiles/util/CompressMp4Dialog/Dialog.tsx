import React, { useState, useEffect } from "react";
import { dialogController } from "./Controller";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import CompressProgress from "../CompressProgress";
import { useVideoMetadata } from "../getVideoMetadata";
import { css } from "@emotion/css";

const toHHMMSS = (seconds: number) =>
  new Date(1000 * seconds).toISOString().substring(11, 19);

type State =
  | {
      open: false;
    }
  | ({
      open: true;
      file: File;
      ifNo: () => void;
      onTranscoded: (b64: string) => void;
    } & (
      | { transcode: "asking" }
      | {
          transcode: "yes";
          scale: "960:540" | "1280:720";
        }
    ));
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
  const tal = css`
    text-align: left;
  `;
  return (
    <Dialog open>
      <DialogTitle>Reduce Video Size?</DialogTitle>
      <DialogContent>
        {state.transcode === "asking" ? (
          <>
            <table style={{ width: "100%" }}>
              <tr>
                <th className={tal}>Name:</th>
                <td className={tal}>{state.file.name}</td>
              </tr>
              <tr>
                <th className={tal}>Resolution:</th>
                <td className={tal}>
                  {videoMeta?.videoWidth} x {videoMeta?.videoHeight}
                </td>
              </tr>
              <tr>
                <th className={tal}>Length:</th>
                <td className={tal}>
                  {videoMeta?.duration && toHHMMSS(videoMeta.duration)}
                </td>
              </tr>
            </table>
            <DialogContentText>
              Reduce file resolution before uploading? This will greatly reduce
              the size of your file.
            </DialogContentText>
          </>
        ) : (
          <CompressProgress
            scale={state.scale}
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
      </DialogContent>
      {state.transcode === "asking" && (
        <DialogActions>
          <Button
            color="secondary"
            variant="contained"
            onClick={() => dialogController.close()}
          >
            Cancel upload
          </Button>
          <Button
            onClick={() => {
              state.ifNo();
              dialogController.close();
            }}
          >
            Upload As-is
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setState((state) => ({
                ...state,
                transcode: "yes",
                scale: "960:540",
              }));
            }}
          >
            540p
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setState((state) => ({
                ...state,
                transcode: "yes",
                scale: "1280:720",
              }));
            }}
          >
            720p
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
export default CompressFileDialog;
