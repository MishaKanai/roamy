import React, { useEffect, useMemo, useState } from "react";
import { getFFMpegStore } from "./FFMpeg";
import getBlobBase64 from "./getBlobBase64";
import { getVideoMetadata } from "./getVideoMetadata";
import parseDurationString from "./parseDurationString";
import CircularProgressWithLabel from "./CircularProgressWithLabel";

const CompressProgress = ({
  file,
  onTranscoded,
}: {
  file: File;
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
    store.subscribe(() => {
      const state = store.getState();
      console.log(state);
      setStoreState(state);
      if (state.status === "transcoding_success") {
        onTranscoded(state.transcodedFileUrl);
      }
    });
  }, []);
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

  const donePercent =
    durationTranscoded !== null && videoLength != null
      ? (durationTranscoded.totalSeconds / videoLength) * 100
      : null;

  const statusElem = (() => {
    switch (storeState.status) {
      case "initial":
        return null;
      case "loading":
        return <p>Loading FFmpeg</p>;
      case "loading_error":
        return <p>Failed to load FFMpeg</p>;
      case "loading_success":
        return (
          <p>
            Loaded&nbsp;
            <button onClick={() => storeState.transcode(file)}>
              Transcode
            </button>
          </p>
        );
      case "transcoding_error":
        return (
          <p>
            Transcoding error&nbsp;
            <button onClick={storeState.retry}>Retry</button>
          </p>
        );
      case "transcoding_pending":
        return <p>Transcoding...</p>;
      case "transcoding_success":
        console.log(storeState.transcodedFileUrl);
        return <p>Done!</p>;
    }
  })();
  return (
    <div>
      {statusElem}
      {donePercent !== null && (
        <CircularProgressWithLabel value={donePercent} />
      )}
      <pre>{storeState.logMsg ?? null}</pre>
    </div>
  );
};
export default CompressProgress;
