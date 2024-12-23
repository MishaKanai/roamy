import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import SlateGraphEditor, { defaultRenderEditableRegion } from "./Editor";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../components/AnchoredPopper";
import { v4 as uuidv4 } from "uuid";
import mergeContext from "../dropbox/resolveMerge/mergeContext";
import { RootAction } from "../store/action";
import { RenderEditableRegion } from "../Autocomplete/Editor/Editor";
import { Descendant } from "slate";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { RootState } from "../store/configureStore";
import { createDoc, deleteDoc, updateDoc } from "./store/globalActions";
import DocTitle from "../components/EditableTitle";
import ReadOnlyDoc from "../Autocomplete/Editor/ReadOnly";
import isSingleFile from "../util/isSingleFile";
import { Box, IconButton } from "@mui/material";
import { DeleteOutline } from "@mui/icons-material";
import CategorySelect from "../Category/Components/CategorySelect";
import { setCategoryId } from "./store/slateDocumentsSlice";

export const useRoamyDispatch = (): ((action: RootAction) => void) => {
  const mergeCtxt = useContext(mergeContext);
  const reduxDispatch = useAppDispatch();
  return mergeCtxt.inMergeContext ? mergeCtxt.dispatch : reduxDispatch;
};

const renderEditableRegionExtraPadding: RenderEditableRegion = ({
  EditableElement,
}) => <div style={{ paddingTop: ".5em" }}>{EditableElement}</div>;

interface PageProps {
  docName: string;
  currDoc?: Descendant[];
  viewedFromParentDoc?: string;
  title?: React.ReactNode;
}

const createInitialEmptyDoc = () =>
  [
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
  ] as any as Descendant[];
export const useCreateChildDoc = (docName: string) => {
  const dispatch = useRoamyDispatch();
  const createChildDoc = useCallback(
    // sets backref to current.
    (newDocName: string) => {
      dispatch(
        createDoc(newDocName, createInitialEmptyDoc(), {
          withBackref: docName,
        })
      );
    },
    [docName, dispatch]
  );

  return createChildDoc;
};
const EditablePage: React.FC<PageProps> = React.memo(
  ({ docName, viewedFromParentDoc, title, currDoc: currDocProp }) => {
    const initialDoc: Descendant[] = useMemo(createInitialEmptyDoc, []);
    const currDoc = useAppSelector(
      (state) => currDocProp ?? state.documents[docName]?.document ?? initialDoc
    );
    const hasBackReferences = useAppSelector((state) =>
      Boolean(state.documents[docName]?.backReferences?.length)
    );
    const hasBackReferencesRef = useRef(hasBackReferences);
    hasBackReferencesRef.current = hasBackReferences;
    const currDocRef = useRef(currDoc);
    currDocRef.current = currDoc; // always have a ref to the current doc- this lets us check it on cleanup to see if doc is nonempty
    // if not, we can safely delete on unmount.

    const dispatch = useRoamyDispatch();

    const createChildDoc = useCreateChildDoc(docName);

    useEffect(() => {
      if (currDoc === initialDoc) {
        dispatch(
          createDoc(
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
          dispatch(deleteDoc(docName));
        }
      };
    }, []); // eslint-disable-line
    const setDoc = useCallback(
      (newDoc: Descendant[]) => {
        dispatch(updateDoc(docName, newDoc, currDocRef.current));
      },
      [docName, dispatch]
    );
    const currentCategoryId = useAppSelector(
      (state) => state.documents[docName]?.categoryId ?? null
    );
    return (
      <div style={{ margin: "0px 0.75em 0em 0em" }}>
        {/* backReferenceLinks && backReferenceLinks.length > 0 ? (
          <ul>{backReferenceLinks}</ul>
        ) : null */}
        <SlateGraphEditor
          title={title}
          createDoc={createChildDoc}
          value={currDoc}
          setValue={setDoc}
          docName={docName}
          renderEditableRegion={
            viewedFromParentDoc
              ? defaultRenderEditableRegion
              : ({ EditableElement, editor }) => (
                  <div style={{ paddingTop: 6 }}>
                    <CategorySelect
                      value={currentCategoryId}
                      onChange={(id) =>
                        dispatch(
                          setCategoryId({ name: docName, categoryId: id })
                        )
                      }
                    />
                    {renderEditableRegionExtraPadding({
                      EditableElement,
                      editor,
                    })}
                  </div>
                )
          }
        />
      </div>
    );
  }
);

const ReadOnlyPage: React.FC<PageProps> = (props) => {
  const initialDoc: Descendant[] = useMemo(createInitialEmptyDoc, []);
  const currDoc = useAppSelector(
    (state) =>
      props.currDoc ?? state.documents[props.docName]?.document ?? initialDoc
  );
  return (
    <ReadOnlyDoc
      title={props.title}
      docName={props.docName}
      document={currDoc}
    />
  );
};

const Page: React.FC<PageProps> = isSingleFile() ? ReadOnlyPage : EditablePage;

export const PageRoute = React.memo(() => {
  let { docName } = useParams<{ docName: string }>();
  const selectBacklinks = useCallback(
    (state: RootState) => state.documents[docName]?.backReferences,
    [docName]
  );
  const title = (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <b
        style={{
          marginTop: "-1px",
          fontSize: "x-large",
          marginBottom: 0,
          textTransform: "capitalize",
        }}
      >
        <DocTitle editable id={docName} type="documents" />
      </b>
      <div>
        <HoverBacklinks key={docName} selectBacklinks={selectBacklinks} />
      </div>
    </div>
  );
  return (
    <Box sx={{ pl: 3 }}>
      <Page title={title} key={docName} docName={docName} />
    </Box>
  );
});

export default Page;
