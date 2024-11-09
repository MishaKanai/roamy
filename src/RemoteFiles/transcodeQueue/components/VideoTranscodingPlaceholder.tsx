import { Skeleton, Typography, useMediaQuery } from "@mui/material";
import React, { useMemo } from "react";
import TranscodingJobTracker from "./TranscodingJobTracker";
import { transcodingQueue } from "../TranscodingQueue";

const VideoTranscodingPlaceholder = ({
  height,
  width,
  jobId,
  duration,
  filename,
}: {
  height?: number | string;
  width?: number | string;
  jobId: string;
  duration?: number;
  filename?: string;
}) => {
  const jobInQueue = useMemo(
    () => transcodingQueue.containsJob(jobId),
    [jobId]
  );
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const maxWidth = isSmallScreen ? 'calc(100vw - 80px)' : 'calc(100vw - 312px)';
  return (
    <div
      contentEditable={false}
      style={{
        height,
        width,
        display: "flex",
        justifyContent: "center",
        alignItems: "center", // Centers content vertically
        position: "relative",
        maxWidth
      }}
    >
      <Skeleton
        animation={!jobInQueue ? false : "pulse"}
        variant="rectangular"
        style={{ height: "100%", width: "100%" }}
      />
      <div
        style={{
          position: "absolute",
        }}
      >
        {!jobInQueue ? (
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
                opacity: ".8",
              }}
            >
              <Typography variant="body1">
                Job not found. This file may have been uploaded in another
                device or tab, and not completed.
              </Typography>
            </div>
          </div>
        ) : (
          <TranscodingJobTracker
            jobId={jobId}
            duration={duration}
            filename={filename}
          />
        )}
      </div>
    </div>
  );
};

export default VideoTranscodingPlaceholder;
