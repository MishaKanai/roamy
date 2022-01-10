import React, { ReactElement, useState } from 'react';
import { TextField, useTheme } from '@mui/material';
import { usePhraseSearch } from '../hooks/useSearch';

const Search: React.FC<{}> = () => {
    const [inputText, setInputText] = useState('')
    const results = usePhraseSearch(inputText.toLowerCase().trim())
    const theme = useTheme()
    return <div>
        <div>
            <TextField label="Search" size="small" value={inputText} onChange={e => setInputText(e.target.value)} />
        </div>
        {inputText && <ul>
            {Object.entries(results).map(([docName, matches]) => {
                return <li key={docName}>
                    <b>{docName}</b>
                    <ul>
                        {Array.from(matches).map((text, i) => <li key={i}>{
                            (() => {
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
                            })()
                        }</li>)}
                    </ul>
                </li>
            })}
        </ul>}
    </div>
}
export default Search