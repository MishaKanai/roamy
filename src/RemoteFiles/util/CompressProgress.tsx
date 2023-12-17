import React, { useEffect, useMemo, useRef, useState } from "react";
import { getFFMpegStore } from "./FFMpeg";
import { getVideoMetadata } from "./getVideoMetadata";
import parseDurationString from "./parseDurationString";
import CircularProgressWithLabel from "./CircularProgressWithLabel";
import { DialogContentText } from "@mui/material";

const CompressProgress = ({
  file,
  onTranscoded,
  scale,
}: {
  file: File;
  scale: "960:540" | "1280:720";
  onTranscoded: (b64: string) => void;
}) => {
  const store = getFFMpegStore();

  // Infinity or NaN means it couldn't be parsed. -1 means initial.
  const [videoLength, setVideoLength] = useState<number>(-1);
  useEffect(() => {
    (async () => {
      const videoMeta = await getVideoMetadata(file);
      setVideoLength(videoMeta.duration);
    })();
  }, []);

  const [storeState, setStoreState] = useState(store.getState());
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();
      setStoreState(state);
      if (state.status === "transcoding_success") {
        onTranscoded(state.transcodedFileUrl);
      }
    });
    store.reset();
    return unsubscribe;
  }, []);

  const ffmpegLoaded = storeState.status === "loading_success";
  useEffect(() => {
    if (ffmpegLoaded) {
      console.log("transcoding");
      storeState.transcode(file, scale);
    }
  }, [ffmpegLoaded, file, scale]);

  const { logMsg } = storeState;

  const durationTranscoded = useMemo(() => {
    if (!logMsg) return null;
    const regex = /time=([^\s]+)/;
    const match = logMsg.match(regex);

    if (match) {
      return parseDurationString(match[1]);
    }
    return null;
  }, [logMsg]);
  const maxSecondsTranscoded = useRef(durationTranscoded?.totalSeconds ?? 0);
  // so that the completed % never goes backwards.
  maxSecondsTranscoded.current = Math.max(
    maxSecondsTranscoded.current,
    durationTranscoded?.totalSeconds ?? 0
  );

  const donePercent =
    durationTranscoded !== null && videoLength != null
      ? (maxSecondsTranscoded?.current / videoLength) * 100
      : null;

  const statusElem = (() => {
    switch (storeState.status) {
      case "initial":
        return null;
      case "loading":
        return <DialogContentText>Loading FFmpeg</DialogContentText>;
      case "loading_error":
        return (
          <DialogContentText>
            Failed to load FFMpeg&nbsp;
            <button onClick={() => storeState.retry()}>Retry</button>
          </DialogContentText>
        );
      case "loading_success":
        return <DialogContentText>FFMpeg Loaded</DialogContentText>;
      case "transcoding_error":
        return (
          <DialogContentText>
            Transcoding error&nbsp;
            <button onClick={storeState.retry}>Retry</button>
          </DialogContentText>
        );
      case "transcoding_pending":
        return <DialogContentText>Transcoding...</DialogContentText>;
      case "transcoding_success":
        console.log(storeState.transcodedFileUrl);
        return <DialogContentText>Done!</DialogContentText>;
    }
  })();
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyItems: "center",
          flexDirection: "column",
        }}
      >
        {statusElem}
        {donePercent !== null && (
          <div>
            <CircularProgressWithLabel value={donePercent} />
          </div>
        )}
      </div>
      <textarea
        disabled
        style={{ width: "100%" }}
        value={storeState.logMsg ?? ""}
      />
    </div>
  );
};
export default CompressProgress;
