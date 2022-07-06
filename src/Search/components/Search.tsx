import React, { ReactElement, useMemo, useState } from 'react';
import { TextField, useTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { usePhraseSearch } from '../hooks/useSearch';

type HighlightedSearchResults = {
    title: string;
    highlightedText: ReactElement[][];
}[]

type RenderHighlightedSearchResults = (results: HighlightedSearchResults, inputText: string) => JSX.Element | null;

const defaultRender: RenderHighlightedSearchResults = (results, inputText) => {
    if (!inputText) {
        return null;
    }
    return <ul>
        {results.map(({ title, highlightedText }) => {
            return <li key={title}>
                <b>{title}</b>
                <ul>
                    {highlightedText.map((elems, i) => <li key={i}>{elems}</li>)}
                </ul>
            </li>
        })}
    </ul>
}
interface SearchProps {
    render?: RenderHighlightedSearchResults;
}
const Search: React.FunctionComponent<SearchProps> = ({ render }) => {
    const [inputText, setInputText] = useState('')
    const results = usePhraseSearch(inputText.toLowerCase().trim())
    const isMobile = useMediaQuery('(max-width:600px)');
    const theme = useTheme()
    const highlightedSearchResults: HighlightedSearchResults = useMemo(() => {
        return Object.entries(results).map(([docName, matches]) => {
            const highlightedText = Array.from(matches).map((text, i) => {
                const matches = (() => {
                    let acc = []
                    let results = text.matchAll(new RegExp(inputText, 'ig'))
                    while(true) {
                        let ni = results.next();
                        if (ni.done) {
                            break;
                        }
                        acc.push(ni.value)
                    }
                    return acc;
                })();
                return text.split(new RegExp(inputText, 'i')).reduce((prev, curr, i) => {
                    const highlightColor = theme.palette.secondary.light;
                    prev.push(<span key={i}>{curr}</span>);
                    prev.push(<span key={i + ':match'} style={{ backgroundColor: highlightColor, color: theme.palette.getContrastText(highlightColor) }}>{matches[i]}</span>)
                    return prev;
                }, [] as ReactElement[])

            })
            return {
                title: docName,
                highlightedText
            }
        })
    }, [results, inputText, theme.palette])
    
    return <div>
        <div>
            <TextField
                fullWidth={isMobile}
                label="Search"
                size="small"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
            />
        </div>
        {(render ?? defaultRender)(highlightedSearchResults, inputText)}
    </div>
}
export default Search