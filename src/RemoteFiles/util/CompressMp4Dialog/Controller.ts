import { getFFMpegStore } from "../FFMpeg";

type Event =
  | {
      type: "open";
      payload: {
        file: File;
        ifNo: () => void;
        onTranscoded: (b64: string) => void;
      };
    }
  | {
      type: "close";
    };

class DialogController {
  subscribers: ((event: Event) => void)[] = [];
  constructor() {
    this.dispatch = this.dispatch.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
  }

  public subscribe(callback: (event: Event) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  }

  public dispatch(event: Event) {
    this.subscribers.forEach((subscriber) => subscriber(event));
  }

  public open(payload: {
    file: File;
    ifNo: () => void;
    onTranscoded: (b64: string) => void;
  }) {
    console.log("open");
    this.dispatch({ type: "open", payload });
  }

  public close() {
    this.dispatch({ type: "close" });
  }
}

export const dialogController = new DialogController();
