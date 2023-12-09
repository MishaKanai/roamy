import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import getBlobBase64 from "./getBlobBase64";

type StoreState = (
  | { status: "initial" }
  | { status: "loading" }
  | {
      status: "loading_error";
      errorMessage: string;
      retry: () => Promise<void>;
    }
  | { status: "loading_success"; transcode(file: File): Promise<string> }
  | {
      status: "transcoding_error";
      errorMessage: string;
      retry: () => Promise<string>;
    }
  | {
      status: "transcoding_pending";
    }
  | {
      status: "transcoding_success";
      transcodedFileUrl: string;
    }
) & {
  logMsg?: string;
};

type EventMessage = {
  type: "stateChange";
  state: StoreState;
};

type Subscriber = (message: EventMessage) => void;

class FFmpegStore {
  private subscribers: Subscriber[] = [];
  private ffmpeg: FFmpeg;
  private loaded = false;

  private state: StoreState = { status: "initial" };
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.loadFFmpeg();
    this.setState = this.setState.bind(this);
    this.loadFFmpeg = this.loadFFmpeg.bind(this);
    this.setState = this.setState.bind(this);
    this.dispatch = this.dispatch.bind(this);
    this.isLoading = this.isLoading.bind(this);
    this.subscribe = this.subscribe.bind(this);
  }

  private setState(
    newState: StoreState | ((prevState: StoreState) => StoreState)
  ) {
    this.state =
      typeof newState === "function" ? newState(this.state) : newState;
    this.dispatch({ type: "stateChange", state: this.state });
  }

  private async loadFFmpeg(): Promise<void> {
    this.setState({ status: "loading" });
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm";

    this.ffmpeg.on("log", ({ message }) => {
      this.setState((state) => ({ ...state, logMsg: message }));
    });

    try {
      await this.ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      const transcode = async (file: File): Promise<string> => {
        this.setState({ status: "transcoding_pending" });
        try {
          await this.ffmpeg.writeFile(file.name, await fetchFile(file));
          await this.ffmpeg.exec([
            "-i",
            file.name,
            "-vf",
            "scale=1280:720",
            "output.mp4",
          ]);
          const data = await this.ffmpeg.readFile("output.mp4");

          const base64 = await getBlobBase64(
            new Blob([data], { type: "video/mp4" })
          );

          this.setState({
            status: "transcoding_success",
            transcodedFileUrl: base64,
          });
          return base64;
        } catch (e: any) {
          console.error(e);
          this.setState({
            status: "transcoding_error",
            errorMessage: e.message,
            retry: () => transcode(file),
          });
          throw e;
        }
      };
      this.setState({ status: "loading_success", transcode });
    } catch (error: any) {
      this.setState({
        status: "loading_error",
        errorMessage: error.message,
        retry: this.loadFFmpeg,
      });
    }
  }

  public getState(): StoreState {
    return this.state;
  }

  private dispatch(message: EventMessage): void {
    this.subscribers.forEach((subscriber) => subscriber(message));
  }

  public isLoading = () => this.loaded;
  public subscribe(subscriber: Subscriber): () => void {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== subscriber);
    };
  }
}

let store: FFmpegStore;
export const getFFMpegStore = () => {
  if (!store) {
    store = new FFmpegStore();
  }
  return store;
};
