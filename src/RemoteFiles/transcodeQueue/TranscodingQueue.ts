import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { v4 as uuidv4 } from "uuid";
import FFmpegPool from "./FFMpegPool";
import getBlobBase64 from "../util/getBlobBase64";
import { LogEventCallback } from "@ffmpeg/ffmpeg/dist/esm/types";

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm";

interface TranscodingJob {
  id: string;
  file: File;
  resolution: "720p" | "540p";
  ffmpeg?: FFmpeg;
  onSuccess: (transcodedFileB64: string) => void;
  onError?: (error: any) => void;
  onCancel?: () => void;
  onLog?: LogEventCallback;
  _cancelLogRef?: {
    cancel?: () => void;
  };
}

class TranscodingQueue {
  private queue: TranscodingJob[] = [];
  private isProcessing = false;

  private ffmpegPool: FFmpegPool = new FFmpegPool(2);

  addJob(job: TranscodingJob) {
    this.queue.push(job);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const job = this.queue[0]; // keep it in the queue so it's discoverable and cancellable.
      if (job) {
        await this.processJob(job);
      }
      this.queue.shift();
    }
    this.isProcessing = false;
  }
  private async processJob(job: TranscodingJob): Promise<void> {
    try {
      job.ffmpeg = await this.ffmpegPool.getAvailableInstance();
      const onLog = job.onLog;
      if (onLog) {
        const ffmpeg = job.ffmpeg;
        ffmpeg.on("log", onLog);
        if (job._cancelLogRef) {
          job._cancelLogRef.cancel = () => {
            ffmpeg.off("log", onLog);
          };
        }
      }
      await job.ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });

      const { file, resolution } = job;
      const inFileName = `${uuidv4()}_${file.name}`;
      await job.ffmpeg.writeFile(inFileName, await fetchFile(file));
      const outputFileName =
        inFileName.replace(/\..+$/, "") + `_${resolution}.mp4`;

      await job.ffmpeg.exec([
        "-i",
        inFileName,
        "-vf",
        `scale=${resolution === "720p" ? "1280x720" : "960x540"}`,
        outputFileName,
      ]);

      const data = await job.ffmpeg.readFile(outputFileName);
      const base64 = await getBlobBase64(
        new Blob([data], { type: "video/mp4" })
      );
      job.onSuccess(base64);

      job.ffmpeg.deleteFile(inFileName);
      job.ffmpeg.deleteFile(outputFileName);
    } catch (error) {
      console.error(error);
      job.onError?.(error);
    } finally {
      if (job.ffmpeg) {
        this.ffmpegPool.releaseInstance(job.ffmpeg);
      }
    }
  }

  subscribeToJob(jobId: string, cb: (msg: { logMsg: string }) => void) {
    const job = this.queue.find((job) => job.id === jobId);
    if (!job || !cb) {
      return;
    }
    const onLog: LogEventCallback = ({ message }) => {
      cb({ logMsg: message });
    };

    if (!job.ffmpeg) {
      if (!job._cancelLogRef) {
        job._cancelLogRef = {};
      }
      job.onLog = onLog;
      return () => job._cancelLogRef?.cancel?.();
    } else {
      job.ffmpeg?.on("log", onLog);
      return () => job.ffmpeg?.off("log", onLog);
    }
  }

  cancelJob(jobId: string): void {
    const jobIndex = this.queue.findIndex((job) => job.id === jobId);
    if (jobIndex !== -1) {
      const foundJob = this.queue[jobIndex];
      const ffmpeg = foundJob.ffmpeg;
      if (ffmpeg) {
        ffmpeg.terminate();
        this.ffmpegPool.releaseInstance(ffmpeg);
      }
      // instead of doing:
      // this.queue.splice(jobIndex, 1);
      // we make it error and let 'processQueue' call unshift when the promise returned by this.processJob returns.
      foundJob?.onCancel?.();
    }
  }
}

const transcodingQueue = new TranscodingQueue();

export { transcodingQueue };
