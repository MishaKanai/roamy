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
): Promise<HTMLVideoElement> => {
  const video = document.createElement("video");
  video.preload = "metadata";
  const b64 =
    typeof b64OrBlob === "string" ? b64OrBlob : await getBlobBase64(b64OrBlob);
  return new Promise((res, rej) => {
    video.onloadedmetadata = function () {
      window.URL.revokeObjectURL(video.src);
      res(video);
    };
    video.onerror = rej;
    video.src = b64;
  });
};

export const useVideoMetadata = (file: File | null) => {
  const [videoMeta, setVideoMeta] = useState<HTMLVideoElement | null>(null);
  useEffect(() => {
    (async () => {
      const videoMeta = file && (await getVideoMetadata(file));
      setVideoMeta(videoMeta);
    })();
  }, [file]);
  return videoMeta;
};
