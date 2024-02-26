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
  resolution: [number, number]; // e.g. [1280, 720] or [960, 540]
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

  private processingJobs: TranscodingJob[] = []; // List of currently processing jobs
  private readonly maxConcurrentJobs = 2; // Maximum number of concurrent jobs

  private ffmpegPool: FFmpegPool = new FFmpegPool(2);

  addJob = (job: TranscodingJob) => {
    this.queue.push(job);
    this.tryStartingNextJobs();
  };

  private tryStartingNextJobs = (): void => {
    while (
      this.processingJobs.length < this.maxConcurrentJobs &&
      this.queue.length > 0
    ) {
      const jobToProcess = this.queue.shift();
      if (jobToProcess) {
        this.processingJobs.push(jobToProcess);
        this.processJob(jobToProcess).finally(() => {
          this.removeJobFromProcessing(jobToProcess);
          this.tryStartingNextJobs(); // Check if more jobs can be started after one finishes
        });
      }
    }
  };

  private removeJobFromProcessing = (job: TranscodingJob): void => {
    const index = this.processingJobs.indexOf(job);
    if (index > -1) {
      this.processingJobs.splice(index, 1);
    } else {
      console.error("NOT FOUND ?", JSON.parse(JSON.stringify(job)));
    }
  };

  private processJob = async (job: TranscodingJob): Promise<void> => {
    try {
      job.ffmpeg = await this.ffmpegPool.getAvailableInstance();

      await job.ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });

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

      const { file, resolution } = job;
      const inFileName = `${uuidv4()}_${file.name}`;
      await job.ffmpeg.writeFile(inFileName, await fetchFile(file));
      const outputFileName =
        inFileName.replace(/\..+$/, "") + `_${resolution.join("x")}.mp4`;

      await job.ffmpeg.exec([
        "-i",
        inFileName,
        "-vf",
        `scale=${resolution.join("x")}`,
        "-preset",
        "veryfast", // TODO: change this according to user device
        "-b:v",
        "400k", // TODO: adjust this as needed.
        "-movflags",
        "faststart", // optimize for web streaming
        "-an", // Removes audio. TODO: make optional
        outputFileName,
      ]);

      const data = await job.ffmpeg.readFile(outputFileName);

      const base64 = await getBlobBase64(
        new Blob([data], { type: "video/mp4" })
      );

      job.onSuccess(base64);

      job.ffmpeg.deleteFile(inFileName);
      job.ffmpeg.deleteFile(outputFileName);

      this.ffmpegPool.releaseInstance(job.ffmpeg, false);
    } catch (error) {
      console.error(error);
      job.onError?.(error);

      if (job.ffmpeg) {
        this.ffmpegPool.releaseInstance(job.ffmpeg, true);
      }
    }
  };

  containsJob = (jobId: string) => {
    return this.getAllJobs().some((job) => job.id === jobId);
  };

  subscribeToJob = (jobId: string, cb: (msg: { logMsg: string }) => void) => {
    const job = this.getAllJobs().find((job) => job.id === jobId);
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
  };

  private getAllJobs = () => {
    return [...this.queue, ...this.processingJobs];
  };

  cancelJob = (jobId: string): void => {
    const allJobs = this.getAllJobs();
    const foundJob = allJobs.find((job) => job.id === jobId);
    if (foundJob) {
      const ffmpeg = foundJob.ffmpeg;
      if (ffmpeg) {
        ffmpeg.terminate(); // will throw an error in 'processJob', and trigger this.ffmpegPool.releaseInstance(ffmpeg, true) in catch block
        // this.ffmpegPool.releaseInstance(ffmpeg, true);
      }
      // instead of doing:
      // this.queue.splice(jobIndex, 1);
      // we make it error and let 'processQueue' call unshift when the promise returned by this.processJob returns.
      foundJob?.onCancel?.();
    }
  };
}

const transcodingQueue = new TranscodingQueue();

export { transcodingQueue };
