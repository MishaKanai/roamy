import React, { useEffect, useMemo, useRef, useState } from "react";
import { transcodingQueue } from "../TranscodingQueue";
import parseDurationString from "../../util/parseDurationString";
import CircularProgressWithLabel from "../../util/CircularProgressWithLabel";
import { Button, Typography } from "@mui/material";

// const useJobStarted = (jobId: string) => {
//   const [jobStarted, setJobStarted] = useState(false);
//   useEffect(() => {
//     return transcodingQueue.subscribeToJob(jobId, ({ logMsg }) => {
//       if (logMsg) {
//         setJobStarted(true);
//       }
//     });
//   }, [jobId]);
//   return jobStarted;
// };

const TranscodingJobTracker = ({
  filename,
  jobId,
  duration,
}: {
  filename?: string;
  jobId: string;
  duration?: number;
}) => {
  const [logMsg, setLogMsg] = useState<string>("");
  useEffect(() => {
    const unsubscribe = transcodingQueue.subscribeToJob(jobId, ({ logMsg }) =>
      setLogMsg(logMsg)
    );
    return unsubscribe;
  }, [jobId]);
  const durationTranscoded = useMemo(() => {
    if (!logMsg) return null;
    const regex = /time=([^\s]+)/;
    const match = logMsg.match(regex);

    if (match) {
      const time = match[1]?.trim();
      if (time && !time.startsWith("-")) return parseDurationString(time);
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
    durationTranscoded !== null && typeof duration === "number"
      ? (maxSecondsTranscoded?.current / duration) * 100
      : null;

  return (
    <div>
      {filename && (
        <div
          style={{
            textAlign: "center",
          }}
        >
          <Typography variant="body1">{filename}</Typography>
        </div>
      )}

      <div
        style={{
          textAlign: "center",
          visibility: typeof donePercent !== "number" ? "hidden" : undefined,
          position: "relative",
        }}
      >
        <CircularProgressWithLabel value={donePercent ?? 0} />
        {typeof donePercent !== "number" && (
          <div
            style={{
              opacity: ".8",
              visibility: "visible",
              position: "absolute",
              top: ".5em",
              left: 0,
              right: 0,
              zIndex: 1000,
            }}
          >
            Waiting in processing queue...
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          cursor: "unset",
        }}
      >
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => {
            transcodingQueue.cancelJob(jobId);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
export default TranscodingJobTracker;
