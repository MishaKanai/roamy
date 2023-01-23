import React from "react";
import { Descendant } from "slate";
import { ReactEditor } from "slate-react";
import SlateAutocompleteEditor, { RenderEditableRegion } from "../Autocomplete/Editor/Editor";
import { drawingTitlesSelector } from "../Excalidraw/globalSelectors";
import { useAppSelector } from "../store/hooks";
import { docTitlesSelector } from "./globalSelectors";

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

  const docTitles = useAppSelector(docTitlesSelector);
  const drawingTitles = useAppSelector(drawingTitlesSelector);

  const getSearchResults = React.useCallback(
    (search, trigger, precedingText = "") => {
      // search results
      return (trigger === "{{" ? drawingTitles : docTitles)
        .filter(([n, title = n]) => docName !== n && (!search || title.startsWith(search)))
        .map(([n, title = n]) => ({
          id: n,
          title
        }));
    },
    [docTitles, drawingTitles, docName]
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
