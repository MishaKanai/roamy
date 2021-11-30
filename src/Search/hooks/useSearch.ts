import { useMemo } from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/createRootReducer';
import { II } from '../util/search';


const useSearch = (inputText: string) => {
    const documents = useSelector((state: RootState) => state.documents);
    const invertedIndex = useMemo(() => {
        if (!II.getIndex()) {
            II.buildInitialIndex(documents);
        } else {
            II.updateIndexWithDocuments(documents);
        }
        return II.getIndex();
    }, [documents])
    const results = useMemo(() => {
        return Object.entries(invertedIndex).filter(([word, entry]) => {
            return word.startsWith(inputText);
        }).reduce((prev, [word, entry]) => {
            Object.entries(entry).forEach(([docName, results]) => {
                if (!prev[docName]) {
                    prev[docName] = new Set()
                }
                Object.keys(results).forEach(path => {
                    prev[docName].add(get(documents[docName].document, path).text)
                })
            })
            return prev;
        }, {} as { [docName: string]: Set<string>})
    }, [invertedIndex, inputText, documents]);
    return results;
}
export default useSearch