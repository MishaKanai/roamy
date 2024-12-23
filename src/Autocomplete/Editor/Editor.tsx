import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
  useContext,
} from "react";
import {
  Editor,
  Transforms,
  Range,
  createEditor,
  Element as SlateElement,
  Descendant,
  Node,
  Location,
  Path,
} from "slate";
import { withHistory } from "slate-history";
import {
  Slate,
  Editable as _Editable,
  ReactEditor,
  withReact,
  useSlate,
  RenderLeafProps,
  RenderElementProps,
} from "slate-react";
import ReactDOM from "react-dom";
import { handleChange } from "./utils/autocompleteUtils";
import isHotkey from "is-hotkey";
import {
  Card,
  IconButton,
  useTheme,
  List,
  ListItem,
  useMediaQuery,
  Skeleton,
  Button,
  Tooltip,
  Chip,
} from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import Page from "../../SlateGraph/Page";
import {
  DrawingElement,
  CustomElement,
  CustomEditor,
  PortalElement,
  ReferenceElement,
  ImageElement,
  RemoteFileElement,
  TranscodingPlaceholderElement,
} from "../../SlateGraph/slate.d";
import Link from "../../components/Link";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../../components/AnchoredPopper";
import DrawingPage from "../../Excalidraw/Page";
import EditIcon from "@mui/icons-material/Edit";
import { drawingOptionsContext } from "../../extension/drawingOptionsContext";
import { withNodeId } from "@udecode/plate-node-id";
import { v4 as uuidv4, v4 } from "uuid";
import mergeContext from "../../dropbox/resolveMerge/mergeContext";
import nestedEditorContext from "../nestedEditorContext";
import useBackgroundColor from "./hooks/useBackgroundColor";
import scrollIntoView from "scroll-into-view-if-needed";
import imageExtensions from "image-extensions";
import isUrl from "is-url";
import { useSlateStatic, useSelected, useFocused } from "slate-react";
import { css } from "@emotion/css";
import { Store } from "redux";
import { useStore } from "react-redux";
import { traverseTransformNodes } from "./utils/traverseTransformNodes";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  Clear,
  DataArray,
  Image as ImageIcon,
  KeyboardDoubleArrowLeft,
} from "@mui/icons-material";
import { RootState } from "../../store/configureStore";
import gifsicle from "gifsicle-wasm-browser";
import { remoteFilesApiContext } from "../../RemoteFiles/remoteFiles";
import { RemoteFilesApi } from "../../RemoteFiles/api";
import { makeStyles } from "@mui/styles";
import DocTitle, { useCategoryColor } from "../../components/EditableTitle";
import hash_sum from "hash-sum";
import { Resizable } from "re-resizable";
import isSingleFile from "../../util/isSingleFile";
import Sticky2 from "./utils/Sticky2";
import { getVideoMetadata } from "../../RemoteFiles/util/videometadata/getVideoMetadata";
import { transcodingQueue } from "../../RemoteFiles/transcodeQueue/TranscodingQueue";
import VideoTranscodingPlaceholder from "../../RemoteFiles/transcodeQueue/components/VideoTranscodingPlaceholder";
import ResolutionDialog from "../../RemoteFiles/util/CompressMp4Dialog/ResolutionDialog";
import getBlobBase64 from "../../RemoteFiles/util/getBlobBase64";
import { createDoc } from "../../SlateGraph/store/globalActions";
import imageCompression from "browser-image-compression";
import FFmpegPool from "../../RemoteFiles/transcodeQueue/FFMpegPool";
import { fetchFile } from "@ffmpeg/util";

const ffmpegPool = new FFmpegPool(3); // Adjust the pool size as needed

export const videoToImage = async (
  videoB64: string,
  options: {
    frameTimeInSeconds?: number;
  } = {
    frameTimeInSeconds: 0.5,
  }
): Promise<string> => {
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.4/dist/esm";
  const ffmpeg = await ffmpegPool.getAvailableInstance();

  try {
    await ffmpeg.load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    });

    // Convert base64 to Blob and load into FFmpeg's filesystem
    const videoBlob = await (await fetch(videoB64)).blob();
    const inFileName = `input_${Date.now()}.mp4`;
    await ffmpeg.writeFile(inFileName, await fetchFile(videoBlob));

    // Set the output filename
    const outputFileName = `frame_${Date.now()}.png`;

    // Execute FFmpeg command to extract a single frame at the specified time
    await ffmpeg.exec([
      "-i",
      inFileName,
      "-ss",
      `${options.frameTimeInSeconds}`, // Seek to the specified time
      "-frames:v",
      "1", // Capture a single frame
      outputFileName,
    ]);

    // Read the output frame file and convert it to a base64 string
    const data = await ffmpeg.readFile(outputFileName);
    const base64Image = `data:image/png;base64,${Buffer.from(data).toString(
      "base64"
    )}`;

    // Clean up files in FFmpeg's filesystem
    ffmpeg.deleteFile(inFileName);
    ffmpeg.deleteFile(outputFileName);

    return base64Image;
  } finally {
    // Release the FFmpeg instance back to the pool
    ffmpegPool.releaseInstance(ffmpeg, true);
  }
};

const getThumbnailFileIdentifier = (fileIdentifier: string) => {
  const r =
    fileIdentifier.split(".").slice(0, -1).join(".") +
    "__thumbnail." +
    fileIdentifier.split(".").pop() +
    ".png";
  return r;
};

type TranscodingDialogState =
  | {
      type: "open";
      videoMetaData: {
        videoHeight: number;
        videoWidth: number;
        sizeKb: number;
      };
      resolve: (resolution: [width: number, height: number]) => void;
    }
  | {
      type: "closed";
    };
const UploadFileButton = React.memo(
  ({
    docName,
    setTranscodingDialogState,
  }: {
    docName: string;
    setTranscodingDialogState: (state: TranscodingDialogState) => void;
  }) => {
    const editor = useSlateStatic();
    const inputRef = useRef<HTMLInputElement>(null);
    const remoteFiles = useContext(remoteFilesApiContext);
    return (
      <span style={{ display: "unset" }}>
        <IconButton
          size="small"
          onClick={() => inputRef.current?.click()}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ImageIcon />
        </IconButton>
        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) {
              return;
            }
            const addFileB64 = (base64: string, at?: Location) => {
              // TODO track uploading in a store (use jobId?)
              return remoteFiles
                .uploadFile({
                  type: "b64",
                  base64,
                  mimeType: file.type,
                })
                .then(({ id: fileIdentifier }) => {
                  return new Promise<{
                    height?: string | number;
                    width?: string | number;
                    fileIdentifier: string;
                  }>((resolve, reject) => {
                    console.log("fileType", file.type);
                    if (file.type.startsWith("video/")) {
                      // start thumbnail
                      videoToImage(base64).then((base64) => {
                        remoteFiles.uploadFile({
                          type: "b64",
                          base64,
                          mimeType: "image/png",
                          forceFileIdentifier:
                            getThumbnailFileIdentifier(fileIdentifier),
                        });
                      });
                      // end thumbnail

                      getVideoMetadata(base64)
                        .then((videoMetadata) => {
                          resolve({
                            fileIdentifier,
                            width: videoMetadata.videoWidth,
                            height: videoMetadata.videoHeight,
                          });
                        })
                        .catch((e) => {
                          console.error(e);
                          resolve({ fileIdentifier });
                        });
                    } else {
                      const img = new Image();

                      img.onload = () => {
                        resolve({
                          fileIdentifier,
                          width: img.width,
                          height: img.height,
                        });
                      };
                      img.onerror = () => resolve({ fileIdentifier });

                      img.src = base64;
                    }
                  });
                })
                .then(({ width, height, fileIdentifier }) => {
                  insertRemoteFile(editor, fileIdentifier, width, height, at);
                });
            };

            if (file.type === "image/gif" && window.confirm("Optimize Gif?")) {
              loadGif(file).then((base64) => {
                addFileB64(base64);
              });
              return;
            }

            const upload = () => {
              const reader = new FileReader();
              reader.readAsDataURL(file as Blob);
              reader.onload = () => {
                const base64 = reader.result as string;
                if (!base64) {
                  return;
                }
                addFileB64(base64);
              };
              reader.onerror = (err) => {
                console.error(err);
              };

              inputRef.current!.value = "";
            };
            if (file.type === "video/mp4" || file.type === "video/quicktime") {
              const id = v4();
              (async () => {
                const { duration, videoHeight, videoWidth } =
                  await getVideoMetadata(file);

                // await transcode here as well.
                // Either prevent navigation, or prevent memory leak
                // if (videoWidth <= 400 || !videoHeight || !videoWidth) {
                //   // ok, Let's not transcode by default.
                //   upload();
                //   return;
                // }
                const _b64 = await getBlobBase64(file);
                const [newWidth, newHeight] = await new Promise<
                  [width: number, height: number]
                >((resolve) => {
                  const sizeKb = getImageSize(_b64, file.type);
                  setTranscodingDialogState({
                    type: "open",
                    resolve,
                    videoMetaData: {
                      videoWidth,
                      videoHeight,
                      sizeKb,
                    },
                  });
                });
                // Let's always compress
                // if (newWidth === videoWidth) {
                //   upload();
                //   return;
                // }
                insertTranscodingPlaceholder(editor, id, {
                  width: newWidth,
                  height: newHeight,
                  duration,
                  filename: file.name,
                });
                const findPlaceholder = (): Path | null => {
                  let path = null;
                  [...Node.descendants(editor, { reverse: true })].forEach(
                    ([node, currentPath]) => {
                      const customNode = node as CustomElement;
                      if (
                        customNode.type === "transcoding_placeholder" &&
                        customNode.jobId === id
                      ) {
                        path = currentPath;
                      }
                    }
                  );
                  return path;
                };

                const removePlaceholder = (): Path | null => {
                  let placeholderLocation = null;
                  while ((placeholderLocation = findPlaceholder())) {
                    if (placeholderLocation) {
                      Transforms.removeNodes(editor, {
                        at: placeholderLocation,
                      });
                    }
                  }
                  return placeholderLocation;
                };

                transcodingQueue.addJob({
                  id,
                  file,
                  resolution: [newWidth, newHeight],
                  onSuccess: (transcodedB64) => {
                    const placeholderLocation = findPlaceholder();
                    addFileB64(
                      transcodedB64,
                      placeholderLocation || undefined
                    ).then(removePlaceholder);
                  },
                  onCancel: () => {
                    removePlaceholder();
                  },
                  onError(err) {
                    console.log("ERROR");
                    console.error(err);
                    // TODO I don't think errors are handled in the placeholder component.
                  },
                });
              })();

              return;
            }

            upload();
          }}
        />
      </span>
    );
  }
);

function loadGif(intFiles: any): Promise<string> {
  return gifsicle
    .run({
      input: [
        {
          file: intFiles,
          name: "1.gif",
        },
      ],
      // E.g. to resize to width of 250px, add:
      // --resize 250x_
      // was -O2 --lossy=60
      command: [
        `
          -O2 --lossy=60
          --resize 250x_
          1.gif 
          -o /out/out2.gif
        `,
      ],
    })
    .then((outFiles: any) => {
      const outputFile = outFiles[0];
      return new Promise((res, rej) => {
        if (!outputFile) {
          rej();
        }
        const reader = new FileReader();
        reader.readAsDataURL(outputFile);
        reader.onload = function () {
          res(reader.result);
        };
        reader.onerror = rej;
      });
    });
}

const getImageSize = (url: string, mimeType: string = "image/gif") => {
  const stringLength = url.length - `data:${mimeType};base64,`.length;
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
  const sizeInKb = sizeInBytes / 1000;
  return sizeInKb;
};

/**
 * Start images
 */

const withImages =
  (config: { store: Store; doc: string; remoteFilesApi: RemoteFilesApi }) =>
  (editor: CustomEditor) => {
    const { insertData, isVoid, isInline } = editor;

    editor.isInline = (element: CustomElement) => {
      return element.type === "image" ||
        element.type === "remotefile" ||
        element.type === "transcoding_placeholder"
        ? true
        : isInline(element);
    };

    editor.isVoid = (element: CustomElement) => {
      return element.type === "image" ||
        element.type === "remotefile" ||
        element.type === "transcoding_placeholder"
        ? true
        : isVoid(element);
    };

    editor.insertData = (data: DataTransfer) => {
      const text = data.getData("text/plain");
      const { files } = data;

      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          const reader = new FileReader();
          const [mime, type] = file.type.split("/");
          if (mime === "image") {
            const dispatchNewDoc = (url: string) => {
              config.remoteFilesApi
                .uploadFile({
                  type: "b64",
                  base64: url,
                  mimeType: file.type,
                })
                .then(({ id: fileIdentifier }) => {
                  return new Promise<{
                    height?: string | number;
                    width?: string | number;
                    fileIdentifier: string;
                  }>((resolve, reject) => {
                    const img = new Image();

                    img.onload = () => {
                      resolve({
                        fileIdentifier,
                        width: img.width,
                        height: img.height,
                      });
                    };
                    img.onerror = () => resolve({ fileIdentifier });

                    img.src = url;
                  });
                })
                .then(({ fileIdentifier, width, height }) => {
                  insertRemoteFile(editor, fileIdentifier, width, height);
                });

              // const id = uuidv4() as any;
              // config.store.dispatch(addPastedFile({
              //   doc: config.doc,
              //   fileData: {
              //     created: Date.now(),
              //     dataURL: url as any,
              //     id,
              //     mimeType: file.type as any
              //   }
              // }));
              // setImmediate(() => insertImage(editor, url, id))
            };
            if (type === "gif" && window.confirm("Optimize Gif?")) {
              loadGif(file).then((optimizedGifB64) => {
                dispatchNewDoc(optimizedGifB64);
              });
            } else {
              reader.addEventListener("load", () => {
                dispatchNewDoc(reader.result as any);
              });
              imageCompression(file, {
                maxSizeMB: 0.2,
                useWebWorker: true,
                fileType: "image/jpeg",
              }).then((compressedFile) => {
                reader.readAsDataURL(compressedFile);
              });
            }
          }
        }
      } else if (isImageUrl(text)) {
        insertImage(editor, text);
      } else {
        insertData(data);
      }
    };
    return editor;
  };

const IdLinkImage = (props: { imageId: string; className: string }) => {
  const image = useAppSelector(
    (state) => state.files.uploadedFiles[props.imageId]
  );
  if (!image) {
    console.error("image not found: " + props.imageId);
    return null;
  }
  if (image.fileData.mimeType.startsWith("video")) {
    return (
      <Video
        src={image.fileData.dataURL}
        type={image.fileData.mimeType}
        fileIdentifier={props.imageId}
      />
    );
  }
  return (
    <img
      alt="user uploaded"
      src={image.fileData.dataURL}
      className={props.className}
    />
  );
};

const useStyles = makeStyles((theme: any) => ({
  wrapper: {
    width: "100%",
    display: "block",
    position: "relative",
    "&::after": {
      content: '""',
      display: "block",
      paddingTop: (props: { ratioStr: string }) => props.ratioStr, // '70%'
    },
  },
  main: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
  },
}));

const Video = ({
  src,
  type,
  fileIdentifier,
}: {
  src: string;
  type: string;
  fileIdentifier?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // useEffect(() => {
  // This really impacts page load when there's a lot of videos on the page.
  // disabling this for now.
  // I added it in order to get thumbnails to show
  // Instead, I'll probably have to extract the image and set as a poster
  // after storing it in dbx separately
  // videoRef.current?.load();
  // }, []);

  const thumnbailB64 = useFetchThumbnail(fileIdentifier);
  const maxWidth = useMaxWidthForEmbeddedThing();
  return (
    <span contentEditable={false} style={{ maxWidth: "100%" }}>
      <video
        playsInline
        ref={videoRef}
        controls
        style={{ width: "100%", maxWidth }}
        poster={thumnbailB64}
      >
        <source src={src} type={type}></source>
        Your browser does not support the video tag.
      </video>
    </span>
  );
};

const useFetchThumbnail = (fileIdentifier?: string) => {
  const thumbnailFileIdentifier = useMemo(
    () => fileIdentifier && getThumbnailFileIdentifier(fileIdentifier),
    [fileIdentifier]
  );
  const state = useFetchRemoteFile(thumbnailFileIdentifier);
  return state.type === "loaded" ? state.base64 : undefined;
};

const useFetchRemoteFile = (fileIdentifier: string | null | undefined) => {
  const remoteFileApi = useContext(remoteFilesApiContext);
  const [state, setState] = useState<
    | {
        type: "initial";
      }
    | {
        type: "loaded";
        base64: string;
        mimeType: string;
      }
  >({ type: "initial" });

  useEffect(() => {
    if (!fileIdentifier) {
      return;
    }
    const download = () =>
      remoteFileApi.downloadFile(fileIdentifier).then(({ base64 }) => {
        setState({
          type: "loaded",
          base64,
          mimeType: base64.split(";base64")[0]?.slice("data:".length),
        });
      });
    download().catch((err) => {
      if (err.status === 409) {
        // lets try to recover the file if we deleted it
        remoteFileApi?.recoverFile?.(fileIdentifier).then(() => {
          // file was successfuylly recovered:
          download();
        });
      }
    });
  }, [fileIdentifier, remoteFileApi]);
  return state;
};

const useIsSmallScreen = () => {
  return useMediaQuery("(max-width:600px)");
};
const useMaxWidthForEmbeddedThing = () => {
  const isSmallScreen = useIsSmallScreen();
  const maxWidth = isSmallScreen ? "calc(100vw - 92px)" : "calc(100vw - 312px)";
  return maxWidth;
};
const RemoteFile = ({
  attributes,
  children,
  element: _element,
}: RenderElementProps) => {
  const element: RemoteFileElement = _element as any;

  const editor = useSlateStatic();
  const path = ReactEditor.findPath(editor, element);

  const selected = useSelected();
  const focused = useFocused();
  const theme = useTheme();
  const classes = useStyles({
    ratioStr: `${((element.height as number) / (element.width as any)) * 100}%`,
  });

  const state = useFetchRemoteFile(element.fileIdentifier);
  const maxWidth = useMaxWidthForEmbeddedThing();
  const isSmallScreen = useIsSmallScreen();
  const imageClassName = css`
    display: block;
    width: 100%;
    max-width: ${maxWidth};
    box-shadow: ${selected && focused
      ? "0 0 0 3px " + theme.palette.action.focus
      : "none"};
  `;

  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        maxWidth: "100%",
        userSelect: "none",
        verticalAlign: "baseline",
        display: "inline-block",
        fontSize: "0.9em",
      }}
    >
      <div
        className={css`
          max-width: 100%;
          display: inline-block;
          position: relative;
        `}
      >
        <Resizable
          maxWidth={"100%"}
          enable={isSmallScreen ? false : undefined}
          lockAspectRatio
          defaultSize={{
            width: element.width ?? 200,
            height: "auto",
          }}
          onResizeStop={(e, direction, ref, d) => {
            const newWidth = parseInt(element.width as any) + d.width;
            const newHeight = parseInt(element.height as any) + d.height;
            Transforms.setNodes(
              editor,
              { width: newWidth, height: newHeight },
              { at: path }
            );
          }}
        >
          {state.type === "initial" ? (
            <div className={imageClassName}>
              <div className={classes.wrapper}>
                <div className={classes.main}>
                  <Skeleton
                    variant="rectangular"
                    style={{ height: "100%", width: "100%" }}
                  />
                </div>
              </div>
            </div>
          ) : state.mimeType.startsWith("image") ? (
            <img
              alt="user uploaded"
              src={state.base64}
              className={imageClassName}
            />
          ) : state.mimeType.startsWith("video") ? (
            <Video
              src={state.base64}
              type={state.mimeType}
              fileIdentifier={element.fileIdentifier}
            />
          ) : (
            <p>File type not supported.</p>
          )}

          {
            /*selected && focused && */ state.type === "loaded" && (
              <span
                className={css`
                  position: absolute;
                  top: 0.5em;
                  left: 0.5em;
                  background-color: ${theme.palette.background.paper};
                `}
              >
                {state.base64 && getImageSize(state.base64).toFixed(0)}
                {" KB"}
              </span>
            )
          }
          {selected && focused && (
            <span
              className={css`
                position: absolute;
                top: 0.5em;
                right: 0.5em;
              `}
            >
              <div style={{ position: "relative" }}>
                <IconButton
                  style={{ backgroundColor: theme.palette.background.paper }}
                  size="small"
                  color="secondary"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    Transforms.removeNodes(editor, { at: path });
                  }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </div>
            </span>
          )}
        </Resizable>
      </div>
      {children}
    </span>
  );
};

const InlineImageOrVideo = ({
  attributes,
  children,
  element: _element,
}: RenderElementProps) => {
  const element: ImageElement = _element as any;
  const editor = useSlateStatic();
  const path = ReactEditor.findPath(editor, element);

  const selected = useSelected();
  const focused = useFocused();
  const theme = useTheme();
  const store = useStore<RootState>();
  const imageClassName = css`
    display: block;
    max-width: 100%;
    max-height: 20em;
    box-shadow: ${selected && focused
      ? "0 0 0 3px " + theme.palette.action.focus
      : "none"};
  `;
  const dataUrl =
    element.variant === "id-link"
      ? store.getState().files.uploadedFiles[element.imageId]?.fileData?.dataURL
      : element.url;
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        maxWidth: "100%",
        userSelect: "none",
        verticalAlign: "baseline",
        display: "inline-block",
        fontSize: "0.9em",
      }}
    >
      <div
        className={css`
          max-width: 100%;
          display: inline-block;
          position: relative;
        `}
      >
        {element.variant === "id-link" ? (
          <IdLinkImage imageId={element.imageId} className={imageClassName} />
        ) : element.url?.startsWith?.("data:video/mp4") ||
          element.url?.endsWith(".mp4") ? (
          <Video
            src={element.url}
            type="video/mp4"
            fileIdentifier={element.imageId}
          />
        ) : (
          <img
            alt="user uploaded"
            src={element.url}
            className={imageClassName}
          />
        )}
        {selected && focused && (
          <span
            className={css`
              position: absolute;
              top: 0.5em;
              left: 0.5em;
              background-color: ${theme.palette.background.paper};
            `}
          >
            {dataUrl && getImageSize(dataUrl).toFixed(0)}
            {" KB"}
          </span>
        )}
        {selected && focused && (
          <span
            className={css`
              position: absolute;
              top: 0.5em;
              right: 0.5em;
            `}
          >
            <div style={{ position: "relative" }}>
              <IconButton
                style={{ backgroundColor: theme.palette.background.paper }}
                size="small"
                color="secondary"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  Transforms.removeNodes(editor, { at: path });
                }}
              >
                <Clear fontSize="small" />
              </IconButton>
            </div>
          </span>
        )}
      </div>
      {children}
    </span>
  );
};

const isImageUrl = (url?: string) => {
  if (!url) return false;
  if (!isUrl(url)) return false;
  const ext = new URL(url).pathname.split(".").pop();
  return ext && imageExtensions.includes(ext);
};

const isIos = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

// const Editable = React.memo(_Editable);
const Editable = _Editable;

/*
    TODO: allow editor composition, like adding 'withTables
*/

const withReferences = (editor: CustomEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element: CustomElement) => {
    return element.type === "reference" ? true : isInline(element);
  };

  editor.isVoid = (element: CustomElement) => {
    return element.type === "reference" ? true : isVoid(element);
  };

  return editor;
};
const withPortals = (editor: CustomEditor) => {
  const { isVoid } = editor;
  editor.isVoid = (element: any) => {
    return element.type === "portal" ? true : isVoid(element);
  };
  return editor;
};

const getPrecedingText = (editor: CustomEditor) =>
  (editor.selection &&
    Editor.string(
      editor,
      Editor.range(
        editor,
        Editor.point(editor, { path: [0, 0], offset: 0 }, { edge: "start" }),
        editor.selection?.focus
      )
    )) ||
  "";

export const Portal: React.FC<{ children: JSX.Element }> = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const HOTKEYS = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+u": "underline",
  "mod+`": "code",
} as const;
type Hotkeys = typeof HOTKEYS;

const LIST_TYPES = ["numbered-list", "bulleted-list"] as const;
type ListTypes = typeof LIST_TYPES;

type HotKeyFormat = Hotkeys[keyof Hotkeys];
type BlockFormat = ListTypes[number] | "heading-one" | "heading-two";
const blockFormatIsList = (
  format: BlockFormat
): format is ListTypes[number] => {
  return LIST_TYPES.includes(format as any);
};

const isMarkActive = (editor: Editor, format: HotKeyFormat) => {
  try {
    const marks = Editor.marks(editor);
    return marks ? (marks as any)[format] === true : false;
  } catch (e) {
    console.error(e);
    return false;
  }
};

const isBlockActive = (editor: Editor, format: BlockFormat) => {
  try {
    const found = !Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as any).type === format,
    }).next().done;

    return Boolean(found);
  } catch (e) {
    console.error(e);
    return false;
  }
};

const toggleMark = (editor: Editor, format: HotKeyFormat) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

const toggleBlock = (editor: Editor, format: BlockFormat) => {
  const isActive = isBlockActive(editor, format);
  const isList = blockFormatIsList(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      LIST_TYPES.includes(
        !Editor.isEditor(n) &&
          SlateElement.isElement(n) &&
          ((n as any).type as any)
      ),
    split: true,
  });
  const newProperties: Partial<SlateElement> = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  } as any;
  Transforms.setNodes(editor, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block as CustomElement);
  }
};

const BlockButton: React.FC<{ format: BlockFormat; icon: JSX.Element }> = ({
  format,
  icon,
}) => {
  const editor = useSlate();
  return (
    <span style={{ display: "unset" }}>
      <IconButton
        style={isBlockActive(editor, format) ? { color: "black" } : undefined}
        size="small"
        onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          toggleBlock(editor, format);
        }}
      >
        {icon}
      </IconButton>
    </span>
  );
};

const CREATE_PREFIX = 'create "';
const MarkButton: React.FC<{ format: HotKeyFormat; icon: JSX.Element }> =
  React.memo(({ format, icon }) => {
    const editor = useSlate();
    const handleMouseDown = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        toggleMark(editor, format);
      },
      [editor, format]
    );

    const markIsActive = isMarkActive(editor, format);
    const theme = useTheme();
    const style = useMemo(() => {
      if (markIsActive) {
        return {
          color: theme.palette.primary.main,
        };
      }
      return undefined;
    }, [markIsActive, theme]);

    return (
      <span style={{ display: "unset" }}>
        <IconButton style={style} size="small" onMouseDown={handleMouseDown}>
          {icon}
        </IconButton>
      </span>
    );
  });

const ReplaceSelectionButton: React.FC<{
  icon: JSX.Element;
  docName: string;
  type: "portal" | "reference";
}> = React.memo(({ icon, docName: rootDocName, type }) => {
  const editor = useSlate();
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!editor.selection) {
        throw new Error("No selection");
      }
      const autoGeneratedDocName = hash_sum(Date.now());
      dispatch(
        createDoc(
          autoGeneratedDocName,
          Editor.fragment(editor, editor.selection),
          {
            withBackref: rootDocName,
          }
        )
      );
      if (type === "reference") {
        insertReference(editor, autoGeneratedDocName);
        return;
      }
      insertPortal(editor, autoGeneratedDocName);
    },
    [editor]
  );
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const style = useMemo(() => {
    return {
      color: theme.palette.primary.main,
    };
  }, [theme]);

  return (
    <span style={{ display: "unset" }}>
      <Tooltip title={`Create ${type}`}>
        <IconButton style={style} size="small" onMouseDown={handleMouseDown}>
          {icon}
        </IconButton>
      </Tooltip>
    </span>
  );
});

const getToolbarStyle = (backgroundColor: string) =>
  ({
    justifyContent: "space-between",
    zIndex: 1004,
    paddingTop: "3px",
    width: "min(100%, 100vw)",
    display: "flex",
    backgroundColor,
  } as const);

const Toolbar = React.memo(
  ({
    title,
    doc,
    setTranscodingDialogState,
  }: {
    title: React.ReactNode;
    doc: string;
    setTranscodingDialogState: (
      ranscodingDialogState: TranscodingDialogState
    ) => void;
  }) => {
    const backgroundColor = useBackgroundColor();
    const toolbarStyle = useMemo(
      () => getToolbarStyle(backgroundColor),
      [backgroundColor]
    );
    const color = useCategoryColor(doc) ?? undefined;
    const editor = useSlate();
    return (
      <div style={toolbarStyle}>
        <div
          style={{
            fontSize: "large",
            padding: "2px",
          }}
        >
          <b style={{ color }}>{title}</b>
        </div>
        <div
          style={{
            height: "100%",
            padding: "2px",
            display: "flex",
            flexDirection: "row",
          }}
        >
          {editor.selection && !Range.isCollapsed(editor.selection) && (
            <>
              <ReplaceSelectionButton
                type="reference"
                icon={<DataArray />}
                docName={doc}
              />
              <ReplaceSelectionButton
                type="portal"
                icon={<KeyboardDoubleArrowLeft />}
                docName={doc}
              />
            </>
          )}
          <MarkButton format="bold" icon={<FormatBoldIcon />} />
          <MarkButton format="italic" icon={<FormatItalicIcon />} />
          <MarkButton format="underline" icon={<FormatUnderlinedIcon />} />
          {/* <BlockButton format="heading-one" icon={<LooksOneIcon />} />
    <BlockButton format="heading-two" icon={<LooksTwoIcon />} /> */}
          <BlockButton
            format="bulleted-list"
            icon={<FormatListBulletedIcon />}
          />
          <UploadFileButton
            docName={doc}
            setTranscodingDialogState={setTranscodingDialogState}
          />
        </div>
      </div>
    );
  }
);

export type RenderEditableRegion = (args: {
  EditableElement: JSX.Element;
  editor: ReactEditor;
}) => JSX.Element;

interface SlateTemplateEditorProps<Triggers extends string[]> {
  title?: React.ReactNode;
  triggers: Triggers;
  getSearchResults: (
    search: string,
    searchTrigger: Triggers[keyof Triggers] | null,
    precedingText: string
  ) => {
    id: string;
    title: string;
  }[];
  value: Descendant[];
  setValue: (value: Descendant[]) => void;
  renderEditableRegion: RenderEditableRegion;
  createDoc: (name: string) => void;
  docName: string;
}

export const useEditor = (doc: string) => {
  const store = useStore();
  const remoteFilesApi = useContext(remoteFilesApiContext);
  return useMemo(
    () =>
      withNodeId({ reuseId: false, idCreator: uuidv4 })(
        withImages({
          store,
          doc,
          remoteFilesApi,
        })(
          withReferences(
            withPortals(withHistory(withReact(createEditor()))) as any
          )
        )
      ),
    [store, doc, remoteFilesApi]
  );
};

const SlateAutocompleteEditorComponent = <Triggers extends string[]>(
  props: SlateTemplateEditorProps<Triggers>
) => {
  const {
    getSearchResults,
    value,
    setValue,
    triggers,
    createDoc,
    docName,
    title,
  } = props;
  const ref = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<Range | null | undefined>();
  const [index, setIndex] = useState(0);
  const [trigger, setTrigger] = useState<Triggers[keyof Triggers] | null>(null);
  const [search, setSearch] = useState("");
  const renderElement = useCallback(
    (props) => <Element parentDoc={docName} {...props} />,
    [docName]
  );
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  const editor = useEditor(docName);
  const docDisplayName = useAppSelector(
    (state) => state.documents[docName]?.displayName
  );
  // editor.children = value is what sets Slate's value when the 'value' prop changes externally.
  // we use useMemo so this is updated before the child renders, so it's up to date
  // (if we used useEffect, we would have to trigger a second rendering after to show the changes.)
  useMemo(() => {
    editor.children = value;
  }, [value, editor]);

  const items = useMemo(() => {
    const precedingText = getPrecedingText(editor);
    const results = getSearchResults(search, trigger, precedingText);
    if (!search) {
      const hash = hash_sum(Date.now()); // create a new random short hash id
      return [
        {
          id: CREATE_PREFIX + hash + '"',
          title: CREATE_PREFIX + hash + '"',
        },
      ].concat(results);
    }
    if (results.some((r) => r.title === search || r.id === search)) {
      return results;
    }
    if (search === docName || search === docDisplayName) {
      return results;
    }
    return results.concat([
      {
        id: CREATE_PREFIX + search + '"',
        title: CREATE_PREFIX + search + '"',
      },
    ]);
  }, [getSearchResults, docName, search, trigger, editor, docDisplayName]);

  const selectItem = useCallback(
    (selected: string) => {
      Transforms.select(editor, target!);
      const isCreate = selected.startsWith(CREATE_PREFIX);
      const docRefName = isCreate
        ? selected.slice(CREATE_PREFIX.length, -1)
        : selected;
      if (trigger === "[[") {
        if (isCreate) {
          createDoc(docRefName);
        }
        insertReference(editor, docRefName);
      } else if (trigger === "<<") {
        if (isCreate) {
          createDoc(docRefName);
        }
        insertPortal(editor, docRefName);
      } else if (trigger === "{{") {
        insertDrawing(editor, docRefName);
      }
      setTarget(null);
    },
    [target, createDoc, editor, trigger]
  );
  const onKeyDown = useCallback(
    (event) => {
      for (const hotkey in HOTKEYS) {
        if (isHotkey(hotkey, event as any)) {
          event.preventDefault();
          const mark = HOTKEYS[hotkey as keyof typeof HOTKEYS];
          toggleMark(editor, mark);
        }
      }
      // handle popup
      if (target) {
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            const prevIndex = index >= items.length - 1 ? 0 : index + 1;
            setIndex(prevIndex);
            break;
          case "ArrowUp":
            event.preventDefault();
            const nextIndex = index <= 0 ? items.length - 1 : index - 1;
            setIndex(nextIndex);
            break;
          case "Tab":
          case "Enter":
            const selected = items[index]?.id;
            if (selected) {
              event.preventDefault();
              selectItem(selected);
            } else {
              console.log(items, index);
              console.error("hit");
            }
            break;
          case "Escape":
            event.preventDefault();
            setTarget(null);
            break;
        }
      }
    },
    [index, search, target, trigger, createDoc] // eslint-disable-line
  );

  useEffect(() => {
    if (target && items.length > 0) {
      const el = ref.current;
      if (el) {
        const domRange = ReactEditor.toDOMRange(editor, target);
        const rect = domRange.getBoundingClientRect();
        el.style.top = `${rect.top + window.pageYOffset + 24}px`;
        el.style.left = `${rect.left + window.pageXOffset}px`;
      }
    }
  }, [items.length, editor, index, search, target]);
  const [isFocused, setIsFocused] = useState(false);
  const _handleChange = useCallback(
    (_value: Descendant[]) => {
      // this gets called on clicks! we need to only update on different values in order to prevent losing focus when changing focus between parents/children/sibling editors
      if (!deepEqual(_value, value)) {
        let found = false;
        const newValue = traverseTransformNodes((_node) => {
          const node = _node as CustomElement;
          if (node.type === "image" && node.variant === "url" && node.imageId) {
            const { variant, url, ...rest } = node;
            found = true;
            return {
              ...rest,
              imageId: node.imageId as string,
              variant: "id-link",
            };
          }
          return null;
        })(_value);
        if (found) {
          console.log("found");
          // this causes reset of editor which we don't want while typing.
          setValue(newValue);
        } else {
          setValue(_value);
        }

        handleChange(
          editor,
          ({ popupTarget, search, trigger }) => {
            setTarget(popupTarget);
            setTrigger(trigger as any);
            setSearch(search);
            setIndex(0);
          },
          () => setTarget(null),
          triggers
        );
      }
    },
    [setValue, triggers, setTarget, setSearch, setIndex, editor, value]
  );
  const handleFocus: any = useCallback(
    (event: any, _editor: any) => {
      setIsFocused(true);
    },
    [setIsFocused]
  );
  const handleBlur = useCallback((e) => setIsFocused(false), [setIsFocused]);
  const backgroundColor = useBackgroundColor();
  const theme = useTheme();

  const toolbarStyle = useMemo(
    () => getToolbarStyle(backgroundColor),
    [backgroundColor]
  );
  const [transcodingDialogState, setTranscodingDialogState] = useState<
    | {
        type: "open";
        videoMetaData: {
          videoHeight: number;
          videoWidth: number;
          sizeKb: number;
        };
        resolve: (resolution: [width: number, height: number]) => void;
      }
    | {
        type: "closed";
      }
  >();
  const renderToolbar = useCallback(
    () => (
      <Toolbar
        title={title}
        doc={docName}
        setTranscodingDialogState={setTranscodingDialogState}
      />
    ),
    [title, docName, setTranscodingDialogState]
  );

  const editable = props.renderEditableRegion({
    editor,
    EditableElement: (
      <Editable
        style={{ outline: "none" }}
        scrollSelectionIntoView={(editor, domRange) => {
          /**
           * default implementation,
           * except short circuit on clicking data-slate-zero-width
           * because clicking on the edge of a  non-text element would cause jump to weird positions.
           */
          if (
            !editor.selection ||
            (editor.selection && Range.isCollapsed(editor.selection))
          ) {
            const leafEl = domRange.startContainer.parentElement!;

            if (leafEl.hasAttribute("data-slate-zero-width")) {
              return;
            }
            leafEl.getBoundingClientRect =
              domRange.getBoundingClientRect.bind(domRange);
            scrollIntoView(leafEl, {
              /**
               * TODO
               * Would be nice to scroll to/near start, but just under the sticky scrollbar
               */
              scrollMode: "if-needed",
              // block: 'center', // block = start | center | end | nearest
            });
            // @ts-expect-error an unorthodox delete D:
            delete leafEl.getBoundingClientRect;
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={onKeyDown}
        placeholder="Enter some text..."
      />
    ),
  });

  const color = useCategoryColor(docName) ?? undefined;

  return (
    <div style={{ position: "relative" }}>
      <Slate editor={editor} initialValue={value} onChange={_handleChange}>
        <span
          style={{
            display: isFocused ? "none" : undefined,
            position: "absolute",
            zIndex: 200,
            fontSize: "large",
            padding: "2px",
            paddingTop: "5px",
            backgroundColor,
            width: "100%",
          }}
        >
          <b style={{ color }}>{title}</b>
        </span>
        {isIos ? (
          <Sticky2 isFocused={isFocused} Toolbar={renderToolbar()}>
            {editable}
          </Sticky2>
        ) : (
          <>
            <span
              onMouseDownCapture={(e) => {
                e.preventDefault();
              }}
              style={{
                ...toolbarStyle,
                visibility: isFocused ? "visible" : "hidden",
                position: "sticky",
                paddingTop: "0px",
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {renderToolbar()}
            </span>
            {editable}
          </>
        )}
        {target && items.length > 0 && (
          <Portal>
            <Card
              ref={ref}
              style={{
                top: "-9999px",
                left: "-9999px",
                position: "absolute",
                zIndex: 999999,
                boxShadow: "0 1px 5px rgba(0,0,0,.2)",
                overflow: "auto",
                maxHeight: "200px",
              }}
            >
              <List dense>
                {items.map((item, i) => (
                  <ListItem
                    button
                    dense
                    key={item.id}
                    onClick={() => selectItem(item.id)}
                    style={{
                      background:
                        i === index ? theme.palette.action.focus : undefined,
                    }}
                  >
                    {item.title}
                  </ListItem>
                ))}
              </List>
            </Card>
          </Portal>
        )}
      </Slate>
      {transcodingDialogState?.type === "open" && (
        <ResolutionDialog
          onSubmit={([w, h]) => {
            transcodingDialogState.resolve([w, h]);
            setTranscodingDialogState({ type: "closed" });
          }}
          sizeKb={transcodingDialogState.videoMetaData.sizeKb}
          HeightToWidthRatio={
            transcodingDialogState.videoMetaData.videoHeight /
            transcodingDialogState.videoMetaData.videoWidth
          }
          originalWidth={transcodingDialogState.videoMetaData.videoWidth}
        />
      )}
    </div>
  );
};

export const Leaf: React.FC<RenderLeafProps> = React.memo(
  ({ attributes, children, leaf }) => {
    if ((leaf as any).bold) {
      children = <strong>{children}</strong>;
    }

    if ((leaf as any).italic) {
      children = <em>{children}</em>;
    }

    if ((leaf as any).underline) {
      children = <u>{children}</u>;
    }

    return <span {...attributes}>{children}</span>;
  }
);

const insertTranscodingPlaceholder = (
  editor: CustomEditor,
  jobId: string,
  meta?: {
    width?: number | string;
    height?: number | string;
    duration?: number;
    filename?: string;
  }
) => {
  const { width, height, duration, filename } = meta ?? {};
  const transcodingPlaceholder: TranscodingPlaceholderElement = {
    type: "transcoding_placeholder",
    jobId,
    width,
    height,
    duration,
    filename,
    children: [{ text: jobId }],
  };
  Transforms.insertNodes(editor, [
    transcodingPlaceholder,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};

const insertRemoteFile = (
  editor: CustomEditor,
  fileIdentifier: string,
  width?: number | string,
  height?: number | string,
  at?: Location
) => {
  const remoteFile: RemoteFileElement = {
    type: "remotefile",
    fileIdentifier,
    width,
    height,
    children: [{ text: fileIdentifier }],
  };
  Transforms.insertNodes(
    editor,
    [remoteFile, { type: "paragraph", children: [{ text: "" }] } as any],
    {
      at,
    }
  );
  !at && Transforms.move(editor); // only move the cursor afterwards if we are inserting at the current cursor.
};

const insertImage = (editor: CustomEditor, url: string, imageId?: string) => {
  const image: ImageElement = {
    type: "image",
    variant: "url",
    imageId,
    url,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, [
    image,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};

const insertDrawing = (editor: CustomEditor, drawingReference: string) => {
  const drawing: DrawingElement = {
    type: "drawing",
    drawingReference,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, [
    drawing,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};
const insertPortal = (editor: CustomEditor, portalReference: string) => {
  const portal: PortalElement = {
    type: "portal",
    portalReference,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, [
    portal,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};
const insertReference = (editor: CustomEditor, docReference: string) => {
  const reference: ReferenceElement = {
    type: "reference",
    docReference,
    children: [{ text: "[[" + docReference + "]]" }],
  };
  Transforms.insertNodes(editor, [
    reference,
    // { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};

const Reference: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element,
}) => {
  // const selected = useSelected();
  // const focused = useFocused();
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        userSelect: "none",
        verticalAlign: "baseline",
        display: "inline-block",
        fontSize: "0.9em",
        // boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
      }}
    >
      <Link to={`/docs/${(element as any).docReference}`}>
        <DocTitle type="documents" id={(element as any).docReference} />
        {/* [[{(element as any).docReference}]] */}
      </Link>
      {children}
    </span>
  );
};

const TogglableEditableDrawing: React.FC<{
  children: (args: {
    editable: boolean;
    setEditable(editable: boolean): void;
  }) => JSX.Element;
}> = (props) => {
  const [editable, setEditable] = React.useState(false);
  return props.children({ editable, setEditable });
};

export const Element: React.FC<RenderElementProps & { parentDoc: string }> = (
  props
) => {
  const { attributes, children, element } = props;
  const colorOfPortal = useBackgroundColor(1);
  const theme = useTheme();
  const isSmall = useMediaQuery("(max-width:599px)");
  const currentNestingContext = useContext(nestedEditorContext);
  switch (element.type) {
    case "reference":
      return <Reference {...props} />;
    case "drawing":
      const drawingName = (props.element as any).drawingReference as string;
      return (
        <div {...attributes}>
          <div contentEditable={false} style={{ userSelect: "none" }}>
            <mergeContext.Consumer>
              {({ inMergeContext }) =>
                inMergeContext ? (
                  <b>
                    {"{{"}
                    {drawingName}
                    {"}}"}
                  </b>
                ) : (
                  <drawingOptionsContext.Consumer>
                    {({ renderDrawingOptions }) => (
                      <TogglableEditableDrawing>
                        {({ editable, setEditable }) => (
                          <DrawingPage
                            asSvg={isSingleFile() || !editable}
                            preventScrollAndResize={!editable}
                            excalidrawProps={
                              editable
                                ? {
                                    gridModeEnabled: true,
                                    zenModeEnabled: true,
                                  }
                                : {
                                    zenModeEnabled: true,
                                    viewModeEnabled: true,
                                    gridModeEnabled: true,
                                  }
                            }
                            title={
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "row",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <Link
                                    to={`/drawings/${
                                      (element as any).drawingReference
                                    }`}
                                  >
                                    <DocTitle
                                      id={(element as any).drawingReference}
                                      type="drawings"
                                    />
                                  </Link>
                                  <div style={{ marginLeft: ".25em" }}>
                                    <HoverBacklinks
                                      selectBacklinks={(state) =>
                                        state.drawings[drawingName]
                                          ?.backReferences
                                      }
                                      dontInclude={[props.parentDoc]}
                                    />
                                  </div>
                                </div>
                                {(isSmall && props.parentDoc) ||
                                isSingleFile() ? null : (
                                  <span
                                    style={{
                                      marginLeft: ".25em",
                                      marginTop: -4,
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={() => setEditable(!editable)}
                                    >
                                      <EditIcon
                                        fontSize="small"
                                        color={editable ? "primary" : undefined}
                                      />
                                    </IconButton>
                                  </span>
                                )}
                                {editable &&
                                  renderDrawingOptions?.({
                                    drawingId: drawingName,
                                  })}
                              </div>
                            }
                            viewedFromParentDoc={props.parentDoc}
                            drawingName={drawingName}
                          />
                        )}
                      </TogglableEditableDrawing>
                    )}
                  </drawingOptionsContext.Consumer>
                )
              }
            </mergeContext.Consumer>
          </div>
          <div style={{ display: "none" }}>
            {/* https://github.com/ianstormtaylor/slate/issues/3930 */}
            {children}
          </div>
        </div>
      );
    case "portal":
      const docName = (props.element as any).portalReference as string;
      if (currentNestingContext.includes(docName)) {
        return (
          <div {...attributes}>
            <div
              contentEditable={false}
              style={{
                userSelect: "none",
                verticalAlign: "baseline",
                display: "inline-block",
                fontSize: "0.9em",
              }}
            >
              <Chip label={<DocTitle id={docName} type="documents" />} />
              {children}
            </div>
          </div>
        );
      }
      return (
        <div {...attributes}>
          <div
            contentEditable={false}
            style={{
              userSelect: "none",
              border: "1px solid " + theme.palette.divider,
              margin: ".25em",
              padding: ".25em",
              backgroundColor: colorOfPortal,
              // overflow: "hidden",
            }}
          >
            <mergeContext.Consumer>
              {({ inMergeContext }) =>
                inMergeContext ? (
                  // TODO: mergeContext can contain list of docs to merge, and we can make a #link to that doc if present
                  <b>
                    {"<<"}
                    {(element as any).portalReference}
                    {">>"}
                  </b>
                ) : (
                  <Page
                    title={
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <DocTitle
                          to={`/docs/${(element as any).portalReference}`}
                          editable
                          id={(element as any).portalReference}
                          type="documents"
                        />
                        <div style={{ marginLeft: ".25em" }}>
                          <HoverBacklinks
                            selectBacklinks={(state) =>
                              state.documents[docName]?.backReferences
                            }
                            dontInclude={[props.parentDoc]}
                          />
                        </div>
                      </div>
                    }
                    viewedFromParentDoc={props.parentDoc}
                    docName={docName}
                  />
                )
              }
            </mergeContext.Consumer>
          </div>
          <div style={{ display: "none" }}>
            {/* https://github.com/ianstormtaylor/slate/issues/3930 */}
            {children}
          </div>
        </div>
      );
    case "remotefile":
      return <RemoteFile {...props} />;
    case "transcoding_placeholder":
      return (
        <VideoTranscodingPlaceholder
          height={element.height}
          width={element.width}
          jobId={element.jobId}
          duration={element.duration}
          filename={element.filename}
        />
      );
    case "image":
      return <InlineImageOrVideo {...props} />;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    default:
      // return <p {...attributes}>{children}</p>;
      // using a span to simulate <p> to prevent validateDOMNesting error
      // when we have children to the <p> that are lists, etc.
      return (
        <span
          style={{
            display: "block",
            marginLeft: 0,
            marginRight: 0,
          }}
          {...attributes}
        >
          {children}
        </span>
      );
  }
};
const SlateAutocompleteEditorWithContext: <Triggers extends string[]>(
  props: SlateTemplateEditorProps<Triggers>
) => JSX.Element = (props) => {
  const currentNestingContext = useContext(nestedEditorContext);
  const newNestingContext = useMemo(() => {
    return [props.docName, ...currentNestingContext];
  }, [currentNestingContext, props.docName]);
  return (
    <nestedEditorContext.Provider value={newNestingContext}>
      <SlateAutocompleteEditorComponent {...props} />
    </nestedEditorContext.Provider>
  );
};
const SlateAutocompleteEditor = React.memo(SlateAutocompleteEditorWithContext);
export default SlateAutocompleteEditor;
