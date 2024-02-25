import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { base64ToBlob } from "../../../Export/components/createExportZip";
const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm";

/**
 *
 * This is a rather expensive way to get video dimensions, as it processes
 * all frames in the video.
 * I'm holding onto this as a fallback - probably not necessary due to mediainfo.js
 */
export const getVideoInfo = async (
  base64Video: string
): Promise<{ width: number; height: number; duration: number }> => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: `${baseURL}/ffmpeg-core.js`,
    wasmURL: `${baseURL}/ffmpeg-core.wasm`,
  });
  const logs: string[] = [];
  ffmpeg.on("log", (e) => {
    console.log(e.message);
    logs.push(e.message);
  });

  const videoBlob = base64ToBlob(base64Video, "video/mp4");

  const videoUrl = URL.createObjectURL(videoBlob);

  // Load the video file into ffmpeg
  await ffmpeg.writeFile("video.mp4", await fetchFile(videoUrl));
  console.log("d");
  // Run ffmpeg command to get file information
  await ffmpeg.exec(["-i", "video.mp4", "-f", "null", "-"]);

  // Parse ffmpeg logs to find video dimensions and duration
  let width = 0,
    height = 0,
    duration = 0;

  logs.forEach((log) => {
    // Extract dimensions
    const dimensionMatch = log.match(/, (\d+)x(\d+)[, ]/);
    if (dimensionMatch) {
      width = parseInt(dimensionMatch[1], 10);
      height = parseInt(dimensionMatch[2], 10);
    }

    // Extract duration
    const durationMatch = log.match(/Duration: (\d+):(\d+):(\d+\.\d+),/);
    if (durationMatch) {
      const hours = parseFloat(durationMatch[1]);
      const minutes = parseFloat(durationMatch[2]);
      const seconds = parseFloat(durationMatch[3]);
      duration = hours * 3600 + minutes * 60 + seconds;
    }
  });

  // Clean up

  ffmpeg.deleteFile("video.mp4");
  URL.revokeObjectURL(videoUrl);

  return { width, height, duration };
};
