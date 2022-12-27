import words from 'lodash/words';
import uniq from 'lodash/uniq';
import { CustomElement, CustomText } from "../../SlateGraph/slate.d";
import { SlateDocuments } from "../../SlateGraph/store/slateDocumentsSlice";
import { nodeIsText } from '../../Autocomplete/Editor/utils/traverseTransformNodes';

/*
  To implement search,
  probably lets build an inverted index, mapping from:
  
  words onto documents, and specific paragraph "paths" in those documents.
  links onto documents, and specific paragraph "paths" in those documents.
  The latter we can use for backrefs with more detail (previewing how they are referenced) as well.
*/

const traverseSlateNodes = (cb: (text: string, pathToText: string) => void) => {
  const innerTraverse = (slateNodes: (CustomElement | CustomText)[], currPath = '') => {
    slateNodes.forEach((node, i) => {
      const pathToNode = `${currPath}[${i}]`
      if (nodeIsText(node)) {
        cb(node.text, pathToNode);
        return;
      }
      if ((node as any).children) {
        switch (node.type) {
          case 'bulleted-list':
          case 'numbered-list':
            node.children.forEach(({ children }, i) => {
              const path = `${pathToNode}.children[${i}].children`
              innerTraverse(children, path)
            })
            return;
          case 'portal':
            cb(node.portalReference, pathToNode)
            return;
          case 'reference':
            cb(node.docReference, pathToNode)
            return;
          case 'drawing': 
            cb(node.drawingReference, pathToNode);
            return;
          default:
            innerTraverse(node.children, pathToNode + '.children')
        }
      }
    });
  }
  return (nodes: (CustomElement | CustomText)[]) => innerTraverse(nodes);
}
type DocTextCb = (args: {
  docName: string,
  text: string,
  pathToText: string,
}) => void;

const traverseDocs = (docs: SlateDocuments, cb: DocTextCb) => {
  Object.values(docs).forEach(doc => {
    traverseSlateNodes((text, pathToText) => {
      cb({
        docName: doc.name,
        text,
        pathToText
      })
    })(doc.document)
  })
}
export interface InvertedIndex {
  [word: string]: {
    [docName: string]: {
      // in the future we may include 'type' of occurrence
      // in which case lets make the value an object containing that info
      [path: string]: true
    }
  }
}
const updateIndex = (invertedIndex: InvertedIndex): DocTextCb => {
  return ({ docName, text, pathToText }) => {
    uniq(words(text)).forEach(_word => {
      const word = _word.toLowerCase()
      if (!invertedIndex[word]) {
        invertedIndex[word] = {}
      }
      if (!invertedIndex[word][docName]) {
        invertedIndex[word][docName] = {}
      }
      invertedIndex[word][docName][pathToText] = true
    })
  }
}
const buildInvertedIndex = (docs: SlateDocuments) => {
  let invertedIndex: InvertedIndex = {}
  traverseDocs(docs, updateIndex(invertedIndex))
  return invertedIndex;
}

export const II = (() => {
  const docHashes: {
    [docName: string]: string
  } = {}
  let invertedIndex: InvertedIndex | null = null;
  let textNodeCb: DocTextCb | null = null;
  return {
    clear() {
      invertedIndex = null;
      textNodeCb = null;
    },
    buildInitialIndex(docs: SlateDocuments) {
      invertedIndex = buildInvertedIndex(docs);
      textNodeCb = updateIndex(invertedIndex)
      Object.values(docs).forEach(doc => {
        docHashes[doc.name] = doc.documentHash
      })
    },
    updateIndexWithDocuments(docs: SlateDocuments) {
      if (!invertedIndex) {
        throw new Error('inverted index not built - buildInitialIndex has not been called')
      }
      if (!textNodeCb) {
        throw new Error('textNodeCb not initialized - buildInitialIndex has not been called')
      }
      Object.values(docs)
        .filter(doc => !docHashes || doc.documentHash !== docHashes[doc.name])
        .forEach(doc => {
          // delete all old entries for the document being updated
          Object.values(invertedIndex ?? {}).forEach(wordEntry => {
            if (wordEntry[doc.name]) {
              delete wordEntry[doc.name]
            }
          })
          traverseSlateNodes((text, pathToText) => {
            textNodeCb?.({
              text,
              pathToText,
              docName: doc.name
            })
          })(doc.document)
        })
    },
    getIndex() {
      return invertedIndex;
    }
  }
})()