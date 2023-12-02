import Share from "@mui/icons-material/Share";
import { Button } from "@mui/material";
import { useCallback, useContext } from "react";
import { useStore } from "react-redux";
import { RootState } from "../../store/configureStore";
import { saveAs } from "file-saver";
import { remoteFilesApiContext } from "../../RemoteFiles/remoteFiles";
import { ImageElement } from "../../SlateGraph/slate";
import {
  nodeIsText,
  traverseTransformNodes,
} from "../../Autocomplete/Editor/utils/traverseTransformNodes";
import produce from "immer";
import set from "lodash/set";

const ExportButton = () => {
  const store = useStore();
  const remoteFileApi = useContext(remoteFilesApiContext);
  const handleClick = useCallback(async () => {
    const res = await fetch("/singlefile.txt");
    const text = await res.text();

    const currentState = store.getState() as RootState;

    // create a list of all files referenced, and then download all, and then synchronously transform state with immer
    const accRemoteFiles: {
      [fileIdentifier: string]: {
        height?: string | number;
        width?: string | number;
      };
    } = {};
    Object.values(currentState.documents).forEach((doc) => {
      traverseTransformNodes((node) => {
        if (nodeIsText(node)) {
          return null;
        }
        if (node.type === "remotefile") {
          // download file, replace here, and modify state.
          accRemoteFiles[node.fileIdentifier] = {
            height: node.height,
            width: node.width,
          };
        }
        return null;
      })(doc.document);
    });

    const promises = Object.keys(accRemoteFiles).map((id) =>
      remoteFileApi.downloadFile(id).then((res) => ({ id, ...res }))
    );
    const results = await Promise.allSettled(promises);
    const remoteDataById = results.reduce((prev, res) => {
      if (res.status === "rejected") {
        // The file might have been deleted -be graceful? Or try to re-instantiate it.
        // No - let's just add a 'doctor' function which fixes deleted files.
        // Let's make this fail in the future, after fixing dangling files.
        return prev;
      }
      const { id, base64 } = res.value;
      prev[id] = { id, base64 };
      return prev;
    }, {} as { [id: string]: { id: string; base64: string } });

    const newState = produce(currentState, (draftState) => {
      Object.entries(currentState.documents).forEach(([k, doc]) => {
        traverseTransformNodes((node, path) => {
          if (nodeIsText(node)) {
            return null;
          }
          if (node.type === "remotefile") {
            const entry = remoteDataById[node.fileIdentifier];
            if (!entry) {
              console.error("remote file referenced not found.");
              return null;
            }
            const image: ImageElement = {
              type: "image",
              variant: "url",
              imageId: node.fileIdentifier,
              url: entry.base64,
              children: [{ text: "" }],
            };
            set(draftState.documents[k].document, path, image);
          }
          return null;
        })(doc.document);
      });
    });

    const jsonScript = (() => {
      const { documents, drawings, files } = newState as RootState;
      const exportState = { documents, drawings, files };

      return `<script>
                window.INITIAL_STATE = ${JSON.stringify(exportState)};
            </script>`;
    })();
    const newIndexHtml = text.replace(
      "<!--SINGLEFILE_TEMPLATE_MARKER-->",
      jsonScript
    );
    const file = new File([newIndexHtml], "testfile.html", {
      type: "text/html",
    });
    saveAs(file);
  }, []);
  return (
    <Button
      fullWidth
      onClick={handleClick}
      variant="contained"
      color="primary"
      size="small"
      endIcon={<Share fontSize="small" />}
    >
      Share
    </Button>
  );
};
export default ExportButton;
