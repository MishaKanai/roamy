import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useState,
  useContext,
} from "react";
import {
  Editor,
  Transforms,
  Range,
  createEditor,
  Element as SlateElement,
  Descendant,
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
} from "slate-react";
import ReactDOM from "react-dom";
import { handleChange } from "./utils/autocompleteUtils";
import isHotkey from "is-hotkey";
import { Card, IconButton, useTheme, List, ListItem, useMediaQuery } from "@mui/material";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatUnderlinedIcon from "@mui/icons-material/FormatUnderlined";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import Page from "../../SlateGraph/Page";
import { DrawingElement, CustomElement, CustomEditor, PortalElement, ReferenceElement } from "../../SlateGraph/slate.d";
import Link from "../../components/Link";
import deepEqual from "fast-deep-equal";
import HoverBacklinks from "../../components/AnchoredPopper";
import DrawingPage from "../../Excalidraw/Page";
import EditIcon from "@mui/icons-material/Edit";
import { drawingOptionsContext } from "../../extension/drawingOptionsContext";
import { withNodeId } from "@udecode/plate-node-id";
import { v4 as uuidv4 } from 'uuid';
import mergeContext from "../../dropbox/resolveMerge/mergeContext";
import nestedEditorContext from "../nestedEditorContext";
import useBackgroundColor from "./hooks/useBackgroundColor";
import UniversalSticky from "./utils/UniversalSticky3";
import scrollIntoView from 'scroll-into-view-if-needed'


const isIos = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

// const Editable = React.memo(_Editable);
const Editable = _Editable;

/*
    TODO: allow editor composition, like adding 'withTables
*/

const withReferences = (editor: CustomEditor) => {
  const { isInline, isVoid } = editor;

  editor.isInline = (element: CustomElement) => {
    return element.type === "reference" ? true : isInline(element);
  };

  editor.isVoid = (element: CustomElement) => {
    return element.type === "reference" ? true : isVoid(element);
  };

  return editor;
};
const withPortals = (editor: CustomEditor) => {
  const { isVoid } = editor;
  editor.isVoid = (element: any) => {
    return element.type === "portal" ? true : isVoid(element);
  };
  return editor;
};

const getPrecedingText = (editor: CustomEditor) =>
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
    Transforms.wrapNodes(editor, block as CustomElement);
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
const MarkButton: React.FC<{ format: HotKeyFormat; icon: JSX.Element }> = React.memo(({
  format,
  icon,
}) => {
  const editor = useSlate();
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    toggleMark(editor, format);
  }, [editor, format])

  const markIsActive = isMarkActive(editor, format)
  const theme = useTheme();
  const style = useMemo(() => {
    if (markIsActive) {
      return {
        color: theme.palette.primary.main
      }
    }
    return undefined;
  }, [markIsActive, theme])

  return (
    <IconButton
      style={style}
      size="small"
      onMouseDown={handleMouseDown}
    >
      {icon}
    </IconButton>
  );
});

const getToolbarStyle = (backgroundColor: string) => ({
  justifyContent: "space-between",
  zIndex: 1004,
  paddingTop: "3px",
  width: 'min(100%, 100vw)',
  display: "flex",
  backgroundColor,
} as const);

const Toolbar = React.memo(({ title }: { title: React.ReactNode }) => {
  const backgroundColor = useBackgroundColor();
  const toolbarStyle = useMemo(() => getToolbarStyle(backgroundColor), [backgroundColor]);
  return (
    <div style={toolbarStyle}>
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
        {/* <BlockButton format="heading-one" icon={<LooksOneIcon />} />
    <BlockButton format="heading-two" icon={<LooksTwoIcon />} /> */}
        <BlockButton
          format="bulleted-list"
          icon={<FormatListBulletedIcon />}
        />
      </div>
    </div>
  )
})

export type RenderEditableRegion = (args: {
  EditableElement: JSX.Element;
  editor: ReactEditor;
}) => JSX.Element;

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
  value: Descendant[];
  setValue: (value: Descendant[]) => void;
  renderEditableRegion: RenderEditableRegion;
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

const SlateAutocompleteEditorComponent = <Triggers extends string[]>(
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
  const editor = useEditor();
  // editor.children = value is what sets Slate's value when the 'value' prop changes externally.
  // we use useMemo so this is updated before the child renders, so it's up to date
  // (if we used useEffect, we would have to trigger a second rendering after to show the changes.)
  useMemo(() => {
    editor.children = value;
  }, [value, editor])


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

  const selectItem = useCallback((selected: string) => {
    Transforms.select(editor, target!);
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
      insertDrawing(editor, docRefName);
    }
    setTarget(null);
  }, [target, createDoc, editor, trigger])
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
              selectItem(selected);
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
  const [isFocused, setIsFocused] = useState(false);
  const _handleChange = useCallback(
    (_value: Descendant[]) => {
      // this gets called on clicks! we need to only update on different values in order to prevent losing focus when changing focus between parents/children/sibling editors
      if (!deepEqual(_value, value)) {
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
  const backgroundColor = useBackgroundColor();
  const theme = useTheme()

  const toolbarStyle = useMemo(() => getToolbarStyle(backgroundColor), [backgroundColor])
  const renderToolbar = useCallback(() => <Toolbar title={title} />, [title]);

  const editable = props.renderEditableRegion({
    editor,
    EditableElement: (
      <Editable
        scrollSelectionIntoView={(editor, domRange) => {
          /**
           * default implementation,
           * except short circuit on clicking data-slate-zero-width
           * because clicking on the edge of a  non-text element would cause jump to weird positions.
           */
          if (
            !editor.selection ||
            (editor.selection && Range.isCollapsed(editor.selection))
          ) {
            const leafEl = domRange.startContainer.parentElement!

            if (leafEl.hasAttribute('data-slate-zero-width')) {
              return;
            }
            leafEl.getBoundingClientRect = domRange.getBoundingClientRect.bind(domRange)
            scrollIntoView(leafEl, {
              /**
               * TODO
               * Would be nice to scroll to/near start, but just under the sticky scrollbar
               */
              scrollMode: 'if-needed',
              // block: 'center', // block = start | center | end | nearest
            })
            // @ts-expect-error an unorthodox delete D:
            delete leafEl.getBoundingClientRect
          }
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={onKeyDown}
        placeholder="Enter some text..."
      />
    ),
  })

  return (
    <div style={{ position: 'relative' }}>
      <Slate editor={editor} value={value} onChange={_handleChange}>
        <span
          style={{
            display: isFocused ? 'none' : undefined,
            position: "absolute",
            zIndex: 200,
            fontSize: "large",
            padding: "2px",
            paddingTop: "5px",
            backgroundColor,
            width: '100%'
          }}
        >
          <b>{title}</b>
        </span>
        {isIos ? (
          <UniversalSticky
            isFocused={isFocused}
            renderToolbar={renderToolbar}
          >
            {editable}
          </UniversalSticky>
        ) : (<>
          <span
            onMouseDownCapture={(e) => {
              e.preventDefault();
            }}
            style={{
              ...toolbarStyle,
              visibility: isFocused ? "visible" : "hidden",
              position: "sticky",
              paddingTop: "0px",
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {renderToolbar()}
          </span>
          {editable}
        </>)}
        {target && chars.length > 0 && (
          <Portal>
            <Card
              ref={ref}
              style={{
                top: "-9999px",
                left: "-9999px",
                position: "absolute",
                zIndex: 999999,
                boxShadow: "0 1px 5px rgba(0,0,0,.2)",
                overflow: "auto",
                maxHeight: "200px",
              }}
            >
              <List dense>
                {chars.map((char, i) => (
                  <ListItem button dense key={char.text} onClick={() => selectItem(char.char)} style={{
                    background: i === index ? theme.palette.action.focus : undefined,
                  }}>
                    {char.text}
                  </ListItem>
                ))}
              </List>
            </Card>
          </Portal>
        )}
      </Slate>
    </div>
  );
};

export const Leaf: React.FC<RenderLeafProps> = React.memo(({ attributes, children, leaf }) => {
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
});
const insertDrawing = (editor: CustomEditor, drawingReference: string) => {
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
const insertPortal = (editor: CustomEditor, portalReference: string) => {
  const portal: PortalElement = {
    type: "portal",
    portalReference,
    children: [{ text: "" }],
  };
  Transforms.insertNodes(editor, [
    portal,
    { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};
const insertReference = (editor: CustomEditor, docReference: string) => {
  const reference: ReferenceElement = {
    type: "reference",
    docReference,
    children: [{ text: "[[" + docReference + "]]" }],
  };
  Transforms.insertNodes(editor, [
    reference,
    // { type: "paragraph", children: [{ text: "" }] } as any,
  ]);
  Transforms.move(editor);
};

const Reference: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element,
}) => {
  // const selected = useSelected();
  // const focused = useFocused();
  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        userSelect: "none",
        verticalAlign: "baseline",
        display: "inline-block",
        fontSize: "0.9em",
        // boxShadow: selected && focused ? "0 0 0 2px #B4D5FF" : "none",
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
  const colorOfPortal = useBackgroundColor(1);
  const theme = useTheme();
  const isSmall = useMediaQuery("(max-width:599px)");
  switch ((element as any).type) {
    case "reference":
      return <Reference {...props} />;
    case "drawing":
      const drawingName = (props.element as any).drawingReference as string;
      return (
        <div {...attributes}>
          <div contentEditable={false} style={{ userSelect: "none" }}>
            <mergeContext.Consumer>{({ inMergeContext }) => inMergeContext ? (
              <b>{'{{'}{drawingName}{'}}'}</b>
            ) : (
              <drawingOptionsContext.Consumer>
                {({ renderDrawingOptions }) => (
                  <TogglableEditableDrawing>
                    {({ editable, setEditable }) => (
                      <DrawingPage
                        asSvg={!editable}
                        preventScrollAndResize={!editable}
                        excalidrawProps={
                          editable
                            ? {
                              gridModeEnabled: true,
                              zenModeEnabled: true,
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
                              {(element as any).drawingReference}
                            </Link>
                            <span style={{ marginLeft: '.25em' }}>
                              <HoverBacklinks
                                selectBacklinks={state =>
                                  state.drawings[drawingName]?.backReferences
                                }
                                dontInclude={[props.parentDoc]}
                              />
                            </span>
                            {isSmall && props.parentDoc && !editable ? null : <span style={{ marginLeft: '.25em', marginTop: -4 }}><IconButton
                              size="small"
                              onClick={() => setEditable(!editable)}
                            >
                              <EditIcon
                                fontSize="small"
                                color={editable ? "primary" : undefined}
                              />
                            </IconButton></span>}
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
          </div>
          <div style={{ display: 'none' }}>
            {/* https://github.com/ianstormtaylor/slate/issues/3930 */}
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
              userSelect: "none",
              border: "1px solid " + theme.palette.divider,
              margin: ".25em",
              padding: ".25em",
              backgroundColor: colorOfPortal
              // overflow: "hidden",
            }}
          >
            <mergeContext.Consumer>{({ inMergeContext }) => (inMergeContext ? (
              // TODO: mergeContext can contain list of docs to merge, and we can make a #link to that doc if present
              <b>{'<<'}{(element as any).portalReference}{'>>'}</b>
            ) : (
              <Page
                title={
                  <div style={{ display: "flex", flexDirection: "row" }}>
                    <Link to={`/docs/${(element as any).portalReference}`}>
                      {(element as any).portalReference}
                    </Link>
                    <span style={{ marginLeft: '.25em' }}>
                      <HoverBacklinks
                        selectBacklinks={state =>
                          state.documents[docName]?.backReferences
                        }
                        dontInclude={[props.parentDoc]}
                      />
                    </span>
                  </div>
                }
                viewedFromParentDoc={props.parentDoc}
                docName={docName}
              />
            ))}</mergeContext.Consumer>
          </div>
          <div style={{ display: 'none' }}>
            {/* https://github.com/ianstormtaylor/slate/issues/3930 */}
            {children}
          </div>
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
        marginLeft: 0,
        marginRight: 0,
      }} {...attributes}>{children}</span>;
  }
};
const SlateAutocompleteEditorWithContext: <Triggers extends string[]>(props: SlateTemplateEditorProps<Triggers>) => JSX.Element = props => {
  const currentNestingContext = useContext(nestedEditorContext);
  const newNestingContext = useMemo(() => {
    return [props.docName, ...currentNestingContext]
  }, [currentNestingContext, props.docName])
  return <nestedEditorContext.Provider value={newNestingContext}>
    <SlateAutocompleteEditorComponent {...props} />
  </nestedEditorContext.Provider>
}
const SlateAutocompleteEditor = React.memo(SlateAutocompleteEditorWithContext);
export default SlateAutocompleteEditor;
