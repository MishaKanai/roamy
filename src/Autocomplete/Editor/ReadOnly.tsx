import React, { useCallback } from "react";
import { Descendant } from "slate";
import { Slate as SL, Editable } from "slate-react";
import DocTitle from "../../components/EditableTitle";
import { useEditor, Element, Leaf } from "./Editor";

const Slate: any = SL;
interface ReadOnlyDocProps {
  document: Descendant[];
  docName: string;
  title?: React.ReactNode;
}
const ReadOnlyDoc: React.FC<ReadOnlyDocProps> = ({
  document,
  docName,
  title,
}) => {
  const editor = useEditor(docName);
  const renderElement = useCallback(
    (props) => <Element parentDoc={docName} {...props} />,
    [docName]
  );
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  return (
    <Slate
      editor={editor}
      initialValue={document}
      value={document}
      onChange={(value: any) => null}
    >
      <div style={{ fontSize: "large", padding: "5px 2px 2px" }}>
        <b>{title ?? <DocTitle id={docName} type="documents" />}</b>
      </div>
      <div style={{ height: "6px" }} />
      <Editable
        renderLeaf={renderLeaf}
        renderElement={renderElement}
        readOnly
        placeholder="Enter some plain text..."
      />
    </Slate>
  );
};
export default ReadOnlyDoc;
