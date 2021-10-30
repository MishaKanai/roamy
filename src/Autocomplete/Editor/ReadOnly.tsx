import React, { useCallback } from 'react';
import {
    Slate,
    Editable,
} from "slate-react";
import { useEditor, Element, Leaf } from "./Editor";
import { SlateNode } from "../../SlateGraph/store/domain";

interface ReadOnlyDocProps {
    document: SlateNode[];
    docName: string;
}
const ReadOnlyDoc: React.FC<ReadOnlyDocProps> = ({ document, docName }) => {
    const editor = useEditor();
    const renderElement = useCallback(
        (props) => <Element parentDoc={docName} {...props} />,
        [docName]
    );
    const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
    return (
        <Slate editor={editor} value={document} onChange={value => null}>
            <div style={{ fontSize: "large", padding: '5px 2px 2px' }}>
              <b>{docName}</b>
            </div>
            <div style={{ height: '6px' }} />
            <Editable renderLeaf={renderLeaf} renderElement={renderElement} readOnly placeholder="Enter some plain text..." />
        </Slate>
    )
}
export default ReadOnlyDoc