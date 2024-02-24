import { useEffect, useState } from "react";
import getBlobBase64 from "./getBlobBase64";

/**
 * Gets us:
 * -duration
 * -videoHeight
 * -videoWidth
 */
export const getVideoMetadata = async (
  b64OrBlob: string | Blob
): Promise<
  Pick<HTMLVideoElement, "videoHeight" | "videoWidth" | "duration">
> => {
  const video = document.createElement("video");
  video.preload = "metadata";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    video.autoplay = true;
    video.style.display = "none";
    video.playsInline = true;
    video.muted = true;
  }

  const b64 =
    typeof b64OrBlob === "string" ? b64OrBlob : await getBlobBase64(b64OrBlob);
  return new Promise((res, rej) => {
    video.onloadedmetadata = function () {
      const { videoHeight, videoWidth, duration } = video;
      window.URL.revokeObjectURL(video.src);
      res({ videoHeight, videoWidth, duration });
    };
    video.onerror = rej;
    video.src = b64;
  });
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
