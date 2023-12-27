import { FFmpeg } from "@ffmpeg/ffmpeg";

class FFmpegPool {
  private pool: FFmpeg[];
  private available: number[];
  private waitingResolvers: ((ffmpeg: FFmpeg) => void)[];

  constructor(poolSize: number) {
    this.pool = [];
    this.available = [];
    this.waitingResolvers = [];

    for (let i = 0; i < poolSize; i++) {
      const ffmpeg = new FFmpeg(); // Replace with actual FFmpeg initialization
      this.pool.push(ffmpeg);
      this.available.push(i);
    }
  }

  async getAvailableInstance(): Promise<FFmpeg> {
    if (this.available.length > 0) {
      const index = this.available.shift() as number;
      return this.pool[index];
    } else {
      // Return a promise that resolves when an instance becomes available
      return new Promise<FFmpeg>((resolve) => {
        this.waitingResolvers.push(resolve);
      });
    }
  }

  releaseInstance(ffmpeg: FFmpeg, resetInstance: boolean): void {
    const index = this.pool.indexOf(ffmpeg);
    if (index !== -1) {
      if (resetInstance) {
        this.pool[index] = new FFmpeg();
      }
      // Check if there are any pending requests waiting for an instance
      if (this.waitingResolvers.length > 0) {
        const resolve = this.waitingResolvers.shift()!;
        resolve(ffmpeg);
      } else {
        this.available.push(index);
      }
    }
  }

  async terminateAll(): Promise<void> {
    for (const ffmpeg of this.pool) {
      await ffmpeg.terminate();
    }
  }
}

export default FFmpegPool;
