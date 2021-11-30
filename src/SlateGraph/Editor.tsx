import React from "react";
import { useSelector } from "react-redux";
import { Descendant } from "slate";
import { ReactEditor } from "slate-react";
import SlateAutocompleteEditor, { RenderEditableRegion } from "../Autocomplete/Editor/Editor";
import { drawingNamesSelector } from "../Excalidraw/globalSelectors";
import { docNamesSelector } from "./globalSelectors";

const triggers = ["<<", "[[", "{{"] as ["<<", "[[", "{{"];

export const defaultRenderEditableRegion: RenderEditableRegion = ({
  EditableElement,
}: {
  editor: ReactEditor;
  EditableElement: JSX.Element;
}) => {
  return EditableElement;
};
const SlateGraphEditor: React.FunctionComponent<{
  title?: React.ReactNode;
  value: Descendant[];
  docName: string;
  setValue: (value: Descendant[]) => void;
  createDoc: (newDocName: string) => void;
  renderEditableRegion?: RenderEditableRegion;
}> = React.memo(({ value, setValue, createDoc, docName, title, ...props }) => {
  const docNames = useSelector(docNamesSelector);
  const drawingNames = useSelector(drawingNamesSelector);
  const getSearchResults = React.useCallback(
    (search, trigger, precedingText = "") => {
      // search results
      return (trigger === "{{" ? drawingNames : docNames)
        .filter((n) => docName !== n && (!search || n.startsWith(search)))
        .map((n) => ({
          text: n,
          char: n,
        }));
    },
    [docNames, drawingNames, docName]
  );
  return (
    <SlateAutocompleteEditor
      title={title ?? docName}
      docName={docName}
      key={docName}
      createDoc={createDoc}
      renderEditableRegion={props.renderEditableRegion ?? defaultRenderEditableRegion}
      value={value}
      setValue={setValue}
      triggers={triggers}
      getSearchResults={getSearchResults}
    />
  );
});

export default SlateGraphEditor;
