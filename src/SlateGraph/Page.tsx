import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { RootState } from "../store/createRootReducer";
import SlateGraphEditor from "./Editor";
import {
  createDocAction,
  deleteDocAction,
  updateDocAction,
} from "./store/actions";
import { SlateNode } from "./store/domain";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../components/AnchoredPopper";

interface PageProps {
  docName: string;
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
}

const createInitialEmptyDoc = () => [
  {
    children: [
      {
        type: "paragraph",
        children: [{ text: "" }],
      },
    ],
  },
];
const Page: React.FC<PageProps> = React.memo(
  ({ docName, viewedFromParentDoc, title }) => {
    const initialDoc: SlateNode[] = useMemo(createInitialEmptyDoc, []);
    const currDoc = useSelector(
      (state: RootState) => state.documents[docName]?.document ?? initialDoc
    );
    const hasBackReferences = useSelector((state: RootState) =>
      Boolean(state.documents[docName]?.backReferences?.length)
    );
    const hasBackReferencesRef = useRef(hasBackReferences);
    hasBackReferencesRef.current = hasBackReferences;
    const currDocRef = useRef(currDoc);
    currDocRef.current = currDoc; // always have a ref to the current doc- this lets us check it on cleanup to see if doc is nonempty
    // if not, we can safely delete on unmount.

    const dispatch = useDispatch();

    const createChildDoc = useCallback(
      // sets backref to current.
      (newDocName: string) => {
        dispatch(
          createDocAction(newDocName, createInitialEmptyDoc(), {
            withBackref: docName,
          })
        );
      },
      [docName, dispatch]
    );

    useEffect(() => {
      if (currDoc === initialDoc) {
        dispatch(
          createDocAction(
            docName,
            currDoc,
            viewedFromParentDoc
              ? { withBackref: viewedFromParentDoc }
              : undefined
          )
        );
      }
      return () => {
        if (
          deepEqual(
            currDocRef.current,
            createInitialEmptyDoc() && !hasBackReferencesRef.current
          )
        ) {
          dispatch(deleteDocAction(docName));
        }
      };
    }, []); // eslint-disable-line
    const setDoc = useCallback(
      (newDoc: SlateNode[]) => {
        dispatch(updateDocAction(docName, newDoc, currDocRef.current));
      },
      [docName, dispatch]
    );
    return (
      <div style={{ margin: ".5em", marginTop: 0 }}>
        {/* backReferenceLinks && backReferenceLinks.length > 0 ? (
          <ul>{backReferenceLinks}</ul>
        ) : null */}
        <SlateGraphEditor
          title={title}
          createDoc={createChildDoc}
          value={currDoc}
          setValue={setDoc}
          docName={docName}
        />
      </div>
    );
  }
);

export const PageRoute = React.memo(() => {
  let { docName } = useParams<{ docName: string }>();
  const selectBacklinks = useCallback(
    (state: RootState) => state.documents[docName]?.backReferences,
    [docName]
  );
  const title = (
    <div style={{ display: "flex", flexDirection: "row" }}>
      <b style={{ fontSize: "x-large", marginBottom: 0 }}>{docName}</b>&nbsp;
      <span style={{ position: "relative" }}>
        <span style={{ position: "absolute", bottom: 0, whiteSpace: "nowrap" }}>
          <HoverBacklinks key={docName} selectBacklinks={selectBacklinks} />
        </span>
      </span>
    </div>
  );
  return (
    <div style={{ margin: ".5em" }}>
      <Page title={title} key={docName} docName={docName} />
    </div>
  );
});

export default Page;
