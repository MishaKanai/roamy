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
  Editable,
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
import { SlateNode } from "../../SlateGraph/store/domain";
import { Link } from "react-router-dom";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../../components/AnchoredPopper";

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
    return element.type === "reference" ? true : isInline(element);
  };

  editor.isVoid = (element: SlateElement) => {
    return element.type === "reference" ? true : isVoid(element);
  };

  return editor;
};
const withPortals = (editor: ReactEditor) => {
  const { isVoid } = editor;
  editor.isVoid = (element) => {
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
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

const isBlockActive = (editor: Editor, format: BlockFormat) => {
  const found = !Editor.nodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === format,
  }).next().done;

  return Boolean(found);
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
        !Editor.isEditor(n) && SlateElement.isElement(n) && (n.type as any)
      ),
    split: true,
  });
  const newProperties: Partial<SlateElement> = {
    type: isActive ? "paragraph" : isList ? "list-item" : format,
  };
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

const SlateAutocompleteEditor = <Triggers extends string[]>(
  props: SlateTemplateEditorProps<Triggers>
) => {
  const {
    getSearchResults,
    value,
    setValue,
    triggers,
    createDoc,
    docName,
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
  const editor: ReactEditor = useMemo(
    () => withReferences(withPortals(withReact(withHistory(createEditor())))),
    []
  );
  const chars = useMemo(() => {
    const precedingText = getPrecedingText(editor);
    const results = getSearchResults(search, trigger, precedingText);
    if (
      !search ||
      results.some((r) => r.text === search || r.char === search)
    ) {
      return results;
    }
    return results.concat([
      {
        char: CREATE_PREFIX + search + '"',
        text: CREATE_PREFIX + search + '"',
      },
    ]);
  }, [getSearchResults, search, trigger, editor]);
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
            const selected = chars[index].char;
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
              } else {
                if (isCreate) {
                  createDoc(docRefName);
                }
                insertPortal(editor, docRefName);
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
  return (
    <div style={{ display: "initial" }}>
      <Slate editor={editor} value={value} onChange={_handleChange}>
        <div
          style={{
            display: isFocused ? undefined : "none",
            position: "sticky",
            paddingTop: "5px",
            top: 0,
            backgroundColor: theme.palette.background.paper,
          }}
        >
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
          {/* <Toolbar>
            <MarkButton format="bold" icon={<FormatBoldIcon />} />
            <MarkButton format="italic" icon={<FormatItalicIcon />} />
            <MarkButton format="underline" icon={<FormatUnderlinedIcon />} />
            <BlockButton format="heading-one" icon={<LooksOneIcon />} />
            <BlockButton format="heading-two" icon={<LooksTwoIcon />} />
            <BlockButton
              format="bulleted-list"
              icon={<FormatListBulletedIcon />}
            /> */}
          {/* <Popup<Range>
              renderDialogContent={({ closeDialog, optionalData }) => {
                return (
                  <Card style={{ padding: "1em" }}>
                    <CreatePortalForm
                      extraButtons={
                        <Button onClick={closeDialog}>Close</Button>
                      }
                      onSubmit={({ name }) => {
                        const portalNode = {
                          type: "portal",
                          portalReference: name,
                          children: [
                            {
                              text: "<<" + name + ">>",
                            },
                          ],
                        };
                        Transforms.insertNodes(
                          editor,
                          [
                            portalNode,
                            {
                              type: "paragraph",
                              children: [{ text: "" }],
                            },
                          ],
                          { at: optionalData || undefined }
                        );
                        Transforms.deselect(editor);
                        closeDialog();
                      }}
                    />
                  </Card>
                );
              }}
              renderToggler={({ openDialog }) => (
                <Button
                  size="small"
                  color="primary"
                  style={{ float: "right" }}
                  onMouseDown={(e) => e.preventDefault()} // prevent onBlur so we can capture current selection in onClick
                  onClick={(e) => openDialog(editor.selection)()}
                >
                  <AddIcon />
                  <MeetingRoomIcon />
                </Button>
              )}
            /> */}
          {/* </Toolbar> */}
        </div>
        {props.renderEditableRegion({
          editor,
          EditableElement: (
            <Editable
              onFocus={(e) => setIsFocused(true)}
              onBlur={(e) => setIsFocused(false)}
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
                zIndex: 1,
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

const Leaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

const insertPortal = (editor: ReactEditor, portalReference: string) => {
  const portal: PortalElement = {
    type: "portal",
    portalReference,
    children: [{ text: "<<" + portalReference + ">>" }],
  };
  Transforms.insertNodes(editor, [
    portal,
    { type: "paragraph", children: [{ text: "" }] },
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
    { type: "paragraph", children: [{ text: "" }] },
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
      <Link to={`/docs/${element.docReference}`}>
        [[{element.docReference}]]
      </Link>
      {children}
    </span>
  );
};

const Element: React.FC<RenderElementProps & { parentDoc: string }> = (
  props
) => {
  const { attributes, children, element } = props;

  switch (element.type) {
    case "reference":
      return <Reference {...props} />;
    case "portal":
      const docName = props.element.portalReference as string;
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
            <div style={{ display: "flex", flexDirection: "row" }}>
              <Link to={`/docs/${element.portalReference}`}>
                {"<<"}
                {element.portalReference}
                {">>"}
              </Link>
              <HoverBacklinks
                docName={docName}
                dontInclude={[props.parentDoc]}
              />
            </div>
            <Page viewedFromParentDoc={props.parentDoc} docName={docName} />
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
      return <p {...attributes}>{children}</p>;
  }
};

export default SlateAutocompleteEditor;
