import React from 'react';
import { useSelector } from 'react-redux';
import Card from '@mui/material/Card';
import Masonry from '@mui/lab/Masonry';
import { Node } from 'slate';
import { Box, CardContent, CardHeader } from '@mui/material';
import { RootState } from '../../store/createRootReducer';
import sum from 'sum';
import Link from '../../components/Link';
import Search from '../../Search/components/Search';

const serialize = (nodes: any[]) => {
  return nodes.map(n => Node.string(n)).join('\n')
}

const MasonrySearch: React.FC<{}> = () => {
    const documents = useSelector((state: RootState) => {
        return state.documents
    });
    return <div>
        <Box sx={{ ml: '15px', mr: 1, marginTop: '1em', mb: 1 }}>
            <Search render={(results, input) => {
                const resultsObj = results.reduce((prev, curr) => {
                    prev[curr.title] = curr.highlightedText;
                    return prev;
                }, {} as { [docKey: string]: React.ReactElement[][] })
                
                const resultKeys = input ? Object.keys(resultsObj) : Object.keys(documents);
                return <Box sx={{ mr: -1, mt: 2 }}>
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={1}>
                    {resultKeys.map((docKey, index) => {
                        const item = documents[docKey];
                        return <Card key={index}>
                        <CardHeader title={<Link to={'/docs/' + item.name}>{item.name}</Link>} />
                        <CardContent>
                            {(() => {
                                if (input) {
                                    // search results
                                    return resultsObj[docKey];
                                }
                                if (!item.document || item.document.length === 0) {
                                    return null
                                }
                                const corpus = serialize(item.document ?? []);
                                if (!corpus) {
                                    return null;
                                }
                                return sum({ corpus }).summary
                            })()}
                            <div style={{ display: 'flex', justifyContent: 'space-between'}}>
                                <div>
                                    <ul style={{ padding: 0 }}>
                                        {item.backReferences.map(r => <li  style={{ listStyle: 'none' }} key={r}><Link to={'/docs/' + r}>&#8592;&nbsp;{r}</Link></li>)}
                                    </ul>
                                </div>
                                <div style={{ textAlign: 'right'}}>
                                    <ul style={{ padding: 0 }}>
                                        {item.references.map(r => <li style={{ listStyle: 'none' }} key={r}><Link to={'/docs/' + r}>{r}&nbsp;&#8594;</Link></li>)}
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    })}
                    </Masonry>
                </Box>
            }} />
        </Box>
    </div>
}
export default MasonrySearch;