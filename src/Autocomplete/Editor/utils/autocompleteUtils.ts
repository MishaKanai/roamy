import { BasePoint, Editor, Range } from 'slate';

const getBeforeChars = (trigger: string, editor: Editor) => {
    const { selection } = editor;
    if (!selection) {
        return null;
    }
    const wordBefore = Editor.before(editor, selection.focus, { unit: 'word' });
    if (!wordBefore || selection.focus.offset === 0) {
        return null;
    }
    return Editor.string(
            editor,
            Editor.range(
                editor,
                { path: selection.focus.path, offset: wordBefore.offset - trigger.length },
                selection.focus,
            ),
        )
};

export const findTrigger = <E extends string, Triggers extends E[]>(args: {
    triggers: Triggers;
    beforeText?: string;
    editor: Editor;
}): Triggers[any] | null => {
    const { triggers, editor, beforeText } = args;
    const foundTrigger = triggers.find(
        t =>
            beforeText?.endsWith(t) ||
            (() => {
                const beforeChars = getBeforeChars(t, editor);
                return beforeChars === t;
            })(),
    );
    return foundTrigger || null;
};

function escapeRegExp(text: string) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// gets the previous word 'start-point' including dashes, colons, and underscores.
const getLocationOfWordBefore = (editor: Editor) => {
    const getLocationOfWordBeforeInner = (location: BasePoint): BasePoint | undefined => {
        let wordBefore = Editor.before(editor, location, { unit: 'word' })
        if (!wordBefore) {
            return
        }
        let charBeforeWordBefore = Editor.before(editor, wordBefore, { unit: 'character', distance: 1})
        if (charBeforeWordBefore) {
            const prevChar = Editor.string(editor, Editor.range(editor, charBeforeWordBefore, wordBefore))
            if (prevChar === '-' || prevChar === '_' || prevChar === ':') {
                return getLocationOfWordBeforeInner(charBeforeWordBefore) || wordBefore;
            }
        }
        return wordBefore
    }
    return getLocationOfWordBeforeInner
}
export const handleChange = (
    editor: Editor,
    popupShouldOpen: (args: { trigger: string; popupTarget: Range; search: string }) => void,
    popupShouldClose: () => void,
    triggers: string[],
) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection);
         let wordBefore = getLocationOfWordBefore(editor)(start)
      
        // so for << this is <<as
        // and for ^ this is ^as
        // but for { and {# this is as

        for (let i = 0; i < triggers.length; i++) {
            const t = triggers[i];
            const amountOfTriggerInWord = wordBefore
                ? (() => {
                      for (let i = 0; i < t.length; i++) {
                          const sliced = t.slice(i);
                          const str = Editor.string(
                              editor,
                              Editor.range(editor, wordBefore, {
                                  path: wordBefore.path,
                                  offset: wordBefore.offset + t.length,
                              }),
                          );
                          if (str.startsWith(sliced)) {
                              return sliced.length;
                          }
                      }
                      return 0;
                  })()
                : 0;
            const amountOfTriggerLeftOutOfWord = t.length - amountOfTriggerInWord;

            const before = wordBefore
                ? Editor.before(editor, {
                      path: wordBefore.path,
                      offset: wordBefore.offset - (amountOfTriggerLeftOutOfWord - 1),
                  }) ?? wordBefore
                : wordBefore;
            const beforeRange = before && Editor.range(editor, before, start);
            const beforeText = beforeRange && Editor.string(editor, beforeRange);
            if (!beforeText) {
                continue;
            }
            const rxp = '^' + escapeRegExp(t) + '([A-Za-z0-9_\\-:]+)$';
            const beforeMatch = beforeText.match(new RegExp(rxp));
            const after = Editor.after(editor, start);
            const afterRange = Editor.range(editor, start, after);
            const afterText = Editor.string(editor, afterRange);
            const afterMatch = afterText.match(/^(\}|\s|$)/);
            
            if (beforeMatch && afterMatch && beforeRange) {
                popupShouldOpen({
                    trigger: t,
                    popupTarget: beforeRange,
                    search: beforeMatch[1],
                });
                return;
            } else {
                const foundTrigger = findTrigger({
                    triggers: [t],
                    beforeText,
                    editor,
                });
                if (foundTrigger) {
                    const beforeAt = {
                        path: selection.focus.path,
                        offset: start.offset - foundTrigger.length,
                    };
                    const targetRange = Editor.range(editor, beforeAt, /* afterAt */ start);
                    popupShouldOpen({
                        trigger: foundTrigger,
                        popupTarget: targetRange,
                        search: '',
                    });
                    return;
                }
            }
        }
    }
    if (selection) {
        if (
            triggers.every(t => {
                const beforeChar = getBeforeChars(t, editor);
                return beforeChar !== t;
            })
        ) {
            popupShouldClose();
        }
    } else {
        popupShouldClose();
    }
};
