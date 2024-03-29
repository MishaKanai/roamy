import { useMemo } from 'react';
import get from 'lodash/get';
import { II, InvertedIndex } from '../util/search';
import words from 'lodash/words';
import { SlateDocuments } from '../../SlateGraph/store/slateDocumentsSlice';
import { CustomText } from '../../SlateGraph/slate';
import { Descendant } from 'slate';
import { useAppSelector } from '../../store/hooks';
import { DrawingDocuments } from '../../Excalidraw/store/drawingsSlice';

const isTextNode = (node: Descendant): node is CustomText => !(node as any).type && typeof (node as any).text !== 'undefined'
const accumulateText = (node: Descendant, documents: SlateDocuments, drawings: DrawingDocuments): string => {
    if (isTextNode(node)) {
        return node.text;
    }
    if (node.type === 'portal') {
        return documents[node.portalReference]?.displayName ?? node.portalReference;
    }
    if (node.type === 'reference') {
        return documents[node.docReference]?.displayName ?? node.docReference;
    }
    if (node.type === 'drawing') {
        return drawings[node.drawingReference]?.displayName ?? node.drawingReference;
    }
    if (node.type === 'bulleted-list' || node.type === 'numbered-list') {
        // ignore these.
        return ''
    }
    return node.children?.map(n => accumulateText(n, documents, drawings)).join('')
}

// starts at a text node pointed to at path,
// recurse upwards until we find the first wrapping paragraph,
// then combine all child text.
const getTextOfCurrentParagraph = (document: Descendant[], path: string, documents: SlateDocuments, drawings: DrawingDocuments): string => {
    let isChild = /\.children\[[0-9]+\]$/.test(path)
    if (isChild) {
        let pathToParent = path.slice(0, path.lastIndexOf('.children['));
        let parent = get(document, pathToParent)
        if (parent) {
            if (parent.type === 'paragraph' || parent.type === 'list-item' || !parent.type) { // root has no type
                return accumulateText(parent, documents, drawings)
            }
            return getTextOfCurrentParagraph(document, parent, documents, drawings);
        }
    }
    return ''
}
const getResultsForWord = (invertedIndex: InvertedIndex, documents: SlateDocuments, drawings: DrawingDocuments, mode: 'startsWith' | 'fullWord') => {
    const getTextAtPath = (docName: string, path: string) => {
        let res = getTextOfCurrentParagraph(documents[docName].document, path, documents, drawings)
        console.log({
            res
        })
        return res;
    }
    if (mode === 'fullWord') {
        return (wordText: string) => {
            return Object.fromEntries(Object.entries(invertedIndex?.[wordText] ?? {}).map(([docName, entry]) => {
                return [docName, new Set(Object.keys(entry).map(path => getTextAtPath(docName, path)))];
            }))
        }
    }
    return (wordText: string) => {
        return Object.entries(invertedIndex ?? {}).filter(([word, entry]) => {
            return word.startsWith(wordText);
        }).reduce((prev, [word, entry]) => {
            Object.entries(entry).forEach(([docName, results]) => {
                if (!prev[docName]) {
                    prev[docName] = new Set()
                }
                Object.keys(results).forEach(path => {
                    prev[docName].add(getTextAtPath(docName, path))
                })
            })
            return prev;
        }, {} as { [docName: string]: Set<string> })
    }
}
const useInvertedIndex = (documents: SlateDocuments, drawings: DrawingDocuments) => {
    const invertedIndex = useMemo(() => {
        if (!II.getIndex()) {
            II.buildInitialIndex(documents, drawings);
        } else {
            II.updateIndexWithDocuments(documents, drawings);
        }
        return II.getIndex() as InvertedIndex;
    }, [documents, drawings])
    return invertedIndex;
}

export const usePhraseSearch = (inputText: string) => {
    const documents = useAppSelector(state => state.documents);
    const drawings = useAppSelector(state => state.drawings);
    const invertedIndex = useInvertedIndex(documents, drawings);
    let results = useMemo(() => {
        if (!invertedIndex) {
            return {};
        }
        const searchWords = words(inputText);
        let subWordResults = searchWords.map((word, i, arr) => {
            const isLast = i === arr.length - 1;
            let results = getResultsForWord(invertedIndex, documents, drawings, isLast ? 'startsWith' : 'fullWord')(word);
            console.log('phrase resultsforword', {
                results,
                word
            })
            return results;
        }).reduce((prev, curr, i) => {
            const isFirst = i === 0;
            if (isFirst) {
                return curr;
            }
            // delete any documents and text from prev that aren't found in proceeding word search results
            Object.entries(prev).forEach(([docName, textSet]) => {
                if (!curr[docName]) {
                    delete prev[docName];
                } else {
                    for (let text of Array.from(textSet.values())) {
                        if (!curr[docName].has(text)) {
                            prev[docName].delete(text);
                        }
                    }
                }
            })
            return prev;
        }, {} as { [docName: string]: Set<string> })

        const searchResults = Object.fromEntries(Object.entries(subWordResults).flatMap(([docName, textSet]) => {
            const matchingText = Array.from(textSet.values()).filter(text => text.toLowerCase().includes(inputText.toLowerCase()));
            if (matchingText.length === 0) {
                return []
            }
            return [[docName, new Set(matchingText)]] as [string, Set<string>][];
        }));
        // now lets add in matches to the title alone
        // when we support alt-titles, we will have to change this.
        Object.entries(documents).filter(([docKey, { displayName = docKey}]) => displayName.toLowerCase().includes(inputText.toLowerCase())).forEach(([docKey, doc]) => {
            if (!searchResults[docKey]) {
                searchResults[docKey] = new Set()
            }
        })
        return searchResults;
    }, [inputText, documents, drawings, invertedIndex]);
    /**
     * TODO: Searching for drawings??
     */
    return results;
}

const useSearch = (inputText: string) => {
    const documents = useAppSelector(state => state.documents);
    const drawings = useAppSelector(state => state.drawings);
    const invertedIndex = useInvertedIndex(documents, drawings);
    const results = useMemo(() => {
        return getResultsForWord(invertedIndex, documents, drawings, 'startsWith')(inputText);
    }, [invertedIndex, inputText, documents, drawings]);
    return results;
}
export default useSearch