import React, { useState } from 'react';
import { TextField } from '@mui/material';
import useSearch from '../hooks/useSearch';

const Search: React.FC<{}> = () => {
    const [inputText, setInputText] = useState('')
    const results = useSearch(inputText.toLowerCase())
    console.log({
        results
    })
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
                                // this doesn't work when there are periods in the middle for purposes of abbreviation
                                // e.g. D.H.Lawrence
                                let firstIx = 0;
                                const before = text.slice(0, text.toLowerCase().indexOf(inputText.toLowerCase()));
                                const endOfPreviousSentance = before.lastIndexOf('.')
                                if (endOfPreviousSentance !== -1) {
                                    firstIx = endOfPreviousSentance + 1
                                }
                                let lastIx = undefined;
                                const occurrenceEndIx = text.toLowerCase().lastIndexOf(inputText.toLowerCase()) + inputText.length
                                const after = text.slice(occurrenceEndIx);
                                const startOfNextSentance = after.indexOf('.');
                                if (startOfNextSentance !== -1 && after.slice(startOfNextSentance + 1).trim().length > 0) {
                                    lastIx = occurrenceEndIx + startOfNextSentance;
                                }
                                let sentance = text.slice(firstIx, lastIx).trim();
                                if (lastIx) {
                                    sentance = sentance + '. ...';
                                }
                                if (firstIx) {
                                    sentance = '...' + sentance;
                                }
                                return sentance
                                // TODO create highlights of occurrences of inputText
                            })()

                        }</li>)}
                    </ul>
                </li>
            })}
        </ul>}
    </div>
}
export default Search