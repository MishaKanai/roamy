import React, { useCallback, useContext, useEffect, useMemo, useRef } from "react";
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
import { v4 as uuidv4 } from 'uuid';
import mergeContext from "../dropbox/resolveMerge/mergeContext";
import { RootAction } from "../store/action";

export const useRoamyDispatch = (): (action: RootAction) => void => {
  const mergeCtxt = useContext(mergeContext);
  const reduxDispatch = useDispatch();
  return mergeCtxt.inMergeContext ? mergeCtxt.dispatch : reduxDispatch;
}

interface PageProps {
  docName: string;
  currDoc?: SlateNode[];
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
}

const createInitialEmptyDoc = () => [
  {
    id: uuidv4(),
    children: [
      {
        id: uuidv4(),
        type: "paragraph",
        children: [{ id: uuidv4(), text: "" }],
      },
    ],
  },
];
export const useCreateChildDoc = (docName: string) => {
  const dispatch = useRoamyDispatch();
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

  return createChildDoc
}
const Page: React.FC<PageProps> = React.memo(
  ({ docName, viewedFromParentDoc, title, currDoc: currDocProp }) => {
    const initialDoc: SlateNode[] = useMemo(createInitialEmptyDoc, []);
    const currDoc = useSelector(
      (state: RootState) => currDocProp ?? state.documents[docName]?.document ?? initialDoc
    );
    const hasBackReferences = useSelector((state: RootState) =>
      Boolean(state.documents[docName]?.backReferences?.length)
    );
    const hasBackReferencesRef = useRef(hasBackReferences);
    hasBackReferencesRef.current = hasBackReferences;
    const currDocRef = useRef(currDoc);
    currDocRef.current = currDoc; // always have a ref to the current doc- this lets us check it on cleanup to see if doc is nonempty
    // if not, we can safely delete on unmount.

    const dispatch = useRoamyDispatch();

    const createChildDoc = useCreateChildDoc(docName)

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
