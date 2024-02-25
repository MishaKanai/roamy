import MediaInfoFactory, { ReadChunkFunc, type MediaInfo } from "mediainfo.js";

function getMetadata(mi: MediaInfo<"text">, file: Blob) {
  const getSize = () => file.size;
  const readChunk: ReadChunkFunc = (chunkSize, offset) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event: ProgressEvent<FileReader>) => {
        if (event.target?.error) {
          reject(event.target.error);
        }
        resolve(new Uint8Array(event.target?.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
    });

  return mi.analyzeData(getSize, readChunk);
}

const registry: {
  current?: MediaInfo<"text">;
} = {};

const getMediaInfoInstance = async () => {
  if (!registry.current) {
    registry.current = await MediaInfoFactory({ format: "text" });
  }
  return registry.current;
};
// this global mediaInfo instance will remain open. Should we close it on location change?
// We also likely will not be able to check dimensions of multiple videos at once, without creating a processing queue for this.

type VideoInfo = {
  videoWidth: number;
  videoHeight: number;
  duration: number;
};

function parseMediaInfo(output: string): VideoInfo | null {
  const widthMatch = output.match(/Width\s*:\s*([\d\s]+)pixels/);
  const heightMatch = output.match(/Height\s*:\s*([\d\s]+)pixels/);
  const rotationMatch = output.match(/Rotation\s*:\s*([\d\s]+)/);

  // This regular expression captures the duration in seconds and milliseconds
  const durationMatch = output.match(/Duration\s*:\s*(\d+)\s*s\s*(\d+)\s*ms/);

  if (!widthMatch || !heightMatch || !durationMatch) {
    console.error("Failed to parse media info");
    return null;
  }
  if (!rotationMatch) {
    console.error("failed to parse rotation");
    return null;
  }
  const rotationNumber = parseInt(rotationMatch[1].replace(/\s/g, ""), 10);
  // Remove spaces before parsing to integers
  const videoWidth = parseInt(widthMatch[1].replace(/\s/g, ""), 10);
  const videoHeight = parseInt(heightMatch[1].replace(/\s/g, ""), 10);
  // Convert captured duration into total seconds
  const seconds = parseInt(durationMatch[1], 10);
  const milliseconds = parseInt(durationMatch[2], 10);
  const duration = seconds + milliseconds / 1000;

  if (rotationNumber % 180) {
    return {
      videoHeight: videoWidth,
      videoWidth: videoHeight,
      duration,
    };
  }
  return { videoHeight, videoWidth, duration };
}

export const getVideoMetadataViaMediaInfo = async (file: Blob) => {
  const mediaInfoInstance = await getMediaInfoInstance();

  const mediaInfoText = await getMetadata(mediaInfoInstance, file);
  console.log(mediaInfoText);
  return parseMediaInfo(mediaInfoText);
};
