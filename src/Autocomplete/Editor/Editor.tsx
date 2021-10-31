import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  Node,
  Editor,
  Transforms,
  Range,
  createEditor,
  Element as SlateElement,
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
  useSelected,
  useFocused,
} from "slate-react";
import ReactDOM from "react-dom";
import { handleChange } from "./utils/autocompleteUtils";
import isHotkey from "is-hotkey";
import { IconButton, useTheme } from "@material-ui/core";
import FormatBoldIcon from "@material-ui/icons/FormatBold";
import FormatUnderlinedIcon from "@material-ui/icons/FormatUnderlined";
import FormatItalicIcon from "@material-ui/icons/FormatItalic";
import FormatListBulletedIcon from "@material-ui/icons/FormatListBulleted";
import LooksOneIcon from "@material-ui/icons/LooksOne";
import LooksTwoIcon from "@material-ui/icons/LooksTwo";
import Page from "../../SlateGraph/Page";
import { DrawingElement, SlateNode } from "../../SlateGraph/store/domain";
import Link from "../../components/Link";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../../components/AnchoredPopper";
import { RootState } from "../../store/createRootReducer";
import DrawingPage from "../../Excalidraw/Page";
import EditIcon from "@material-ui/icons/Edit";
import { drawingOptionsContext } from "../../extension/drawingOptionsContext";
import PlainTextExample from "./PT";
import { withNodeId } from "@udecode/plate-node-id";
import { v4 as uuidv4 } from 'uuid';
import mergeContext from "../../dropbox/resolveMerge/mergeContext";

const Editable = React.memo(_Editable);

type ReferenceElement = {
  type: "reference";
  docReference: string;
  children: Node[];
};
type PortalElement = {
  type: "portal";
  portalReference: string;
  children: Node[];
};

/*
    TODO: allow editor composition, like adding 'withTables
*/

const withReferences = (editor: ReactEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element: SlateElement) => {
    return (element as any).type === "reference" ? true : isInline(element);
  };

  editor.isVoid = (element: SlateElement) => {
    return (element as any).type === "reference" ? true : isVoid(element);
  };

  return editor;
};
const withPortals = (editor: ReactEditor) => {
  const { isVoid } = editor;
  editor.isVoid = (element: any) => {
    return element.type === "portal" ? true : isVoid(element);
  };
  return editor;
};

const getPrecedingText = (editor: ReactEditor) =>
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
    Transforms.wrapNodes(editor, block);
  }
};

const BlockButton: React.FC<{ format: BlockFormat; icon: JSX.Element }> = ({
  format,
  icon,
}) => {
  const editor = useSlate();
  return (
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
  );
};

const CREATE_PREFIX = 'create "';
const MarkButton: React.FC<{ format: HotKeyFormat; icon: JSX.Element }> = ({
  format,
  icon,
}) => {
  const editor = useSlate();
  return (
    <IconButton
      style={isMarkActive(editor, format) ? { color: "black" } : undefined}
      size="small"
      onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
    >
      {icon}
    </IconButton>
  );
};

interface SlateTemplateEditorProps<Triggers extends string[]> {
  title?: React.ReactNode;
  triggers: Triggers;
  getSearchResults: (
    search: string,
    searchTrigger: Triggers[keyof Triggers] | null,
    precedingText: string
  ) => {
    text: string;
    char: string;
  }[];
  value: Node[];
  setValue: (value: Node[]) => void;
  renderEditableRegion: (args: {
    EditableElement: JSX.Element;
    editor: ReactEditor;
  }) => JSX.Element;
  createDoc: (name: string) => void;
  docName: string;
}

export const useEditor = () => {
  return useMemo(
    () =>
      withReferences(
        withPortals(withReact(withNodeId({ reuseId: false, idCreator: uuidv4 })(withHistory(createEditor())) as any))
      ),
    []
  );
}

const _SlateAutocompleteEditor = <Triggers extends string[]>(
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
  const editor: ReactEditor = useEditor();
  const chars = useMemo(() => {
    const precedingText = getPrecedingText(editor);
    const results = getSearchResults(search, trigger, precedingText);
    if (
      !search ||
      results.some((r) => r.text === search || r.char === search)
    ) {
      return results;
    }
    if (search === docName) {
      return results;
    }
    return results.concat([
      {
        char: CREATE_PREFIX + search + '"',
        text: CREATE_PREFIX + search + '"',
      },
    ]);
  }, [getSearchResults, docName, search, trigger, editor]);
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
            const prevIndex = index >= chars.length - 1 ? 0 : index + 1;
            setIndex(prevIndex);
            break;
          case "ArrowUp":
            event.preventDefault();
            const nextIndex = index <= 0 ? chars.length - 1 : index - 1;
            setIndex(nextIndex);
            break;
          case "Tab":
          case "Enter":
            const selected = chars[index]?.char;
            if (selected) {
              event.preventDefault();
              Transforms.select(editor, target);

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
                if (isCreate) {
                  createDoc(docRefName);
                }
                insertDrawing(editor, docRefName);
              }
              setTarget(null);
            } else {
              console.log(chars, index);
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
    if (target && chars.length > 0) {
      const el = ref.current;
      if (el) {
        const domRange = ReactEditor.toDOMRange(editor, target);
        const rect = domRange.getBoundingClientRect();
        el.style.top = `${rect.top + window.pageYOffset + 24}px`;
        el.style.left = `${rect.left + window.pageXOffset}px`;
      }
    }
  }, [chars.length, editor, index, search, target]);
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const _handleChange = useCallback(
    (_value: SlateNode[]) => {
      // this gets called on clicks! we need to only update on different values in order to prevent losing focus when changing focus between parents/children/sibling editors
      if (!deepEqual(_value, value)) {
        console.log("different values!");
        console.log("c called ", _value);
        setValue(_value);
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
  return (
    <div style={{ display: "initial" }}>
      <Slate editor={editor} value={value} onChange={_handleChange}>
        <span
          style={{
            position: "absolute",
            zIndex: 100,
            fontSize: "large",
            padding: "2px",
            paddingTop: "5px",
          }}
        >
          <b>{title}</b>
        </span>
        <span>
          <span
            onMouseDownCapture={(e) => {
              e.preventDefault();
            }}
            style={{
              visibility: isFocused ? undefined : "hidden",
              justifyContent: "space-between",
              zIndex: 200,
              position: "sticky",
              paddingTop: "3px",
              top: 0,
              right: 0,
              display: "flex",
              backgroundColor: theme.palette.background.paper,
            }}
          >
            <div style={{ fontSize: "large", padding: "2px" }}>
              <b>{title}</b>
            </div>
            <div
              style={{
                height: "100%",
                padding: "2px",
                display: "flex",
                flexDirection: "row",
              }}
            >
              <MarkButton format="bold" icon={<FormatBoldIcon />} />
              <MarkButton format="italic" icon={<FormatItalicIcon />} />
              <MarkButton format="underline" icon={<FormatUnderlinedIcon />} />
              <BlockButton format="heading-one" icon={<LooksOneIcon />} />
              <BlockButton format="heading-two" icon={<LooksTwoIcon />} />
              <BlockButton
                format="bulleted-list"
                icon={<FormatListBulletedIcon />}
              />
            </div>
          </span>
        </span>
        {props.renderEditableRegion({
          editor,
          EditableElement: (
            <Editable
              onFocus={handleFocus}
              onBlur={handleBlur}
              renderElement={renderElement}
              renderLeaf={renderLeaf}
              onKeyDown={onKeyDown}
              placeholder="Enter some text..."
            />
          ),
        })}
        {target && chars.length > 0 && (
          <Portal>
            <div
              ref={ref}
              style={{
                top: "-9999px",
                left: "-9999px",
                position: "absolute",
                zIndex: 999999,
                padding: "3px",
                background: "white",
                borderRadius: "4px",
                boxShadow: "0 1px 5px rgba(0,0,0,.2)",
                overflow: "auto",
                maxHeight: "200px",
              }}
            >
              {chars.map((char, i) => (
                <div
                  key={char.text}
                  style={{
                    padding: "1px 3px",
                    borderRadius: "3px",
                    background: i === index ? "#B4D5FF" : "transparent",
                  }}
                >
                  {char.text}
                </div>
              ))}
            </div>
          </Portal>
        )}
      </Slate>
    </div>
  );
};

export const Leaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
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
};
const insertDrawing = (editor: ReactEditor, drawingReference: string) => {
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
const insertPortal = (editor: ReactEditor, portalReference: string) => {
  const portal: PortalElement = {
    type: "portal",
    portalReference,
    children: [{ text: "<<" + portalReference + ">>" }],
  };
  Transforms.insertNodes(editor, [
    portal,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};
const insertReference = (editor: ReactEditor, docReference: string) => {
  const reference: ReferenceElement = {
    type: "reference",
    docReference,
    children: [{ text: "<<" + docReference + ">>" }],
  };
  Transforms.insertNodes(editor, [
    reference,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};

const Reference: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element,
}) => {
  const selected = useSelected();
  const focused = useFocused();
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        padding: "3px 3px 2px",
        margin: "0 1px",
        verticalAlign: "baseline",
        display: "inline-block",
        borderRadius: "4px",
        backgroundColor: "#eee",
        fontSize: "0.9em",
        boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
      }}
    >
      <Link to={`/docs/${(element as any).docReference}`}>
        [[{(element as any).docReference}]]
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
  switch ((element as any).type) {
    case "reference":
      return <Reference {...props} />;
    case "drawing":
      const drawingName = (props.element as any).drawingReference as string;
      return (
        <div {...attributes}>
          <div contentEditable={false}>
            <mergeContext.Consumer>{({ inMergeContext }) => inMergeContext ? (
              <b>{'{{'}{drawingName}{'}}'}</b>
            ) : (
              <drawingOptionsContext.Consumer>
                {({ renderDrawingOptions }) => (
                  <TogglableEditableDrawing>
                    {({ editable, setEditable }) => (
                      <DrawingPage
                        preventScrollAndResize={!editable}
                        excalidrawProps={
                          editable
                            ? {
                              gridModeEnabled: true,
                            }
                            : {
                              zenModeEnabled: true,
                              viewModeEnabled: true,
                              gridModeEnabled: true,
                            }
                        }
                        title={
                          <div style={{ display: "flex", flexDirection: "row" }}>
                            <Link
                              to={`/drawings/${(element as any).drawingReference
                                }`}
                            >
                              {"{{"}
                              {(element as any).drawingReference}
                              {"}}"}
                            </Link>
                            <HoverBacklinks
                              selectBacklinks={(state: RootState) =>
                                state.drawings[drawingName]?.backReferences
                              }
                              dontInclude={[props.parentDoc]}
                            />
                            <IconButton
                              size="small"
                              onClick={() => setEditable(!editable)}
                            >
                              <EditIcon
                                fontSize="small"
                                color={editable ? "primary" : undefined}
                              />
                            </IconButton>
                            {editable &&
                              renderDrawingOptions?.({ drawingId: drawingName })}
                          </div>
                        }
                        viewedFromParentDoc={props.parentDoc}
                        drawingName={drawingName}
                      />
                    )}
                  </TogglableEditableDrawing>
                )}
              </drawingOptionsContext.Consumer>
            )}</mergeContext.Consumer>
            {children}
          </div>
        </div>
      );
    case "portal":
      const docName = (props.element as any).portalReference as string;
      return (
        <div {...attributes}>
          <div
            contentEditable={false}
            style={{
              border: "1px solid silver",
              margin: ".25em",
              padding: ".25em",
              // overflow: "hidden",
            }}
          >
            {/*
              After Slate version 0.63, the first (and only first) Slate editor rendered below this point has a bad issue:
              When typing with the cursor at the END of the editor's contents, the character is placed at the end but then focus instantly jumps to the beginning of the document.
              Any Slate editors rendered below that editor is apparently free of any issues.

              I have NO idea why this happens.

            */}
            <div style={{ display: "none" }}>
              <PlainTextExample />
            </div>
            <mergeContext.Consumer>{({ inMergeContext }) => (inMergeContext ? (
              // TODO: mergeContext can contain list of docs to merge, and we can make a #link to that doc if present
              <b>{'<<'}{(element as any).portalReference}{'>>'}</b>
            ) : (
              <Page
                title={
                  <div style={{ display: "flex", flexDirection: "row" }}>
                    <Link to={`/docs/${(element as any).portalReference}`}>
                      {"<<"}
                      {(element as any).portalReference}
                      {">>"}
                    </Link>
                    <HoverBacklinks
                      selectBacklinks={(state: RootState) =>
                        state.documents[docName]?.backReferences
                      }
                      dontInclude={[props.parentDoc]}
                    />
                  </div>
                }
                viewedFromParentDoc={props.parentDoc}
                docName={docName}
              />
            ))}</mergeContext.Consumer>
          </div>
          {children}
        </div>
      );
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
      return <span style={{
        display: 'block',
        marginTop: '1em',
        marginBottom: '1em',
        marginLeft: 0,
        marginRight: 0,
      }} {...attributes}>{children}</span>;
  }
};
const SlateAutocompleteEditor = React.memo(_SlateAutocompleteEditor);
export default SlateAutocompleteEditor;
