import React from "react";
import { useSelector } from "react-redux";
import { Node } from "slate";
import SlateAutocompleteEditor from "../Autocomplete/Editor/Editor";
import { docNamesSelector } from "./globalSelectors";

const triggers = ["<<", "[["] as ["<<", "[["];

const SlateGraphEditor: React.FunctionComponent<{
  title?: React.ReactNode;
  value: Node[];
  docName: string;
  setValue: (value: Node[]) => void;
  createDoc: (newDocName: string) => void;
}> = React.memo(({ value, setValue, createDoc, docName, title }) => {
  const docNames = useSelector(docNamesSelector);

  return (
    <SlateAutocompleteEditor
      title={title ?? docName}
      docName={docName}
      key={docName}
      createDoc={createDoc}
      renderEditableRegion={({ EditableElement, editor }) => {
        return EditableElement;
      }}
      value={value}
      setValue={setValue}
      triggers={triggers}
      getSearchResults={(search, trigger, precedingText = "") => {
        // search results
        return docNames
          .filter((n) => docName !== n && (!search || n.startsWith(search)))
          .map((n) => ({
            text: n,
            char: n,
          }));
      }}
    />
  );
});

export default SlateGraphEditor;
