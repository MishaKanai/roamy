import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { usePhraseSearch } from '../hooks/useSearch';

const Search: React.FC<{}> = () => {
    const [inputText, setInputText] = useState('')
    const results = usePhraseSearch(inputText.toLowerCase().trim())
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
                            // TODO: highlight searched phrase.
                           text
                        }</li>)}
                    </ul>
                </li>
            })}
        </ul>}
    </div>
}
export default Search