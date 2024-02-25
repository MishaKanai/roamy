import { useEffect, useState } from "react";
import getBlobBase64 from "../getBlobBase64";
import { getVideoInfo } from "./ffmpegGetVideoMetadata";
import { base64ToBlob } from "../../../Export/components/createExportZip";
import { getVideoMetadataViaMediaInfo } from "./getMediaInfo";

const getIsIpad = () =>
  /Macintosh/i.test(navigator.userAgent) &&
  navigator.maxTouchPoints &&
  navigator.maxTouchPoints > 1;

export const getVideoMetadata = async (
  b64OrBlob: string | Blob
): Promise<
  Pick<HTMLVideoElement, "videoHeight" | "videoWidth" | "duration">
> => {
  const util = {
    getB64: async () =>
      typeof b64OrBlob === "string"
        ? b64OrBlob
        : await getBlobBase64(b64OrBlob),
    getBlob: () =>
      typeof b64OrBlob === "string"
        ? base64ToBlob(b64OrBlob, "video/mp4")
        : b64OrBlob,
  };

  if (!getIsIpad() && !/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    // Except on mobile/safari, this should work to get video dimensions quickly.
    const b64 = await util.getB64();
    const video = document.createElement("video");
    video.preload = "metadata";

    return new Promise((res, rej) => {
      video.onloadedmetadata = function () {
        // TODO: maybe check to see if this never gets called, and move to our fallbacks?
        const { videoHeight, videoWidth, duration } = video;
        window.URL.revokeObjectURL(video.src);
        res({ videoHeight, videoWidth, duration });
      };
      video.onerror = (e) => {
        rej(e);
      };
      video.src = b64;
    });
  }
  // Now let's cycle through our fallback options.

  const blob = util.getBlob();

  const mediaInfo = await getVideoMetadataViaMediaInfo(blob);
  console.log(mediaInfo);
  if (mediaInfo) {
    return mediaInfo;
  }
  console.warn(
    "Failed to get media info using mediainfo.js. Falling back to ffmpeg..."
  );

  const b64 = await util.getB64();
  const { height, width, duration } = await getVideoInfo(b64);
  return {
    videoHeight: height,
    videoWidth: width,
    duration,
  };
};

export const useVideoMetadata = (file: File | null) => {
  const [videoMeta, setVideoMeta] = useState<Pick<
    HTMLVideoElement,
    "videoHeight" | "videoWidth" | "duration"
  > | null>(null);
  useEffect(() => {
    (async () => {
      const videoMeta = file && (await getVideoMetadata(file));
      setVideoMeta(videoMeta);
    })();
  }, [file]);
  return videoMeta;
};
