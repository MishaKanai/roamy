import React from 'react';
import Card from '@mui/material/Card';
import Masonry from '@mui/lab/Masonry';
import { Node } from 'slate';
import { Box, CardContent, CardHeader } from '@mui/material';
import sum from 'sum';
import Link from '../../components/Link';
import Search from '../../Search/components/Search';
import ExcalidrawSvgImage from '../../Excalidraw/ExcalidrawSvgImage';
import { DrawingDocument } from '../../Excalidraw/store/reducer';
import { SlateDocument } from '../../SlateGraph/store/slateDocumentsSlice';
import { sortBy } from 'lodash';
import { useAppSelector } from '../../store/hooks';

const serialize = (nodes: any[]) => {
    return nodes.map(n => Node.string(n)).join('\n')
}

function renderReferences(k: 'references', item: SlateDocument): JSX.Element;
function renderReferences(k: 'backReferences',  item: DrawingDocument | SlateDocument): JSX.Element;
function renderReferences(k: 'backReferences' | 'references', item: any): JSX.Element {
    return <ul style={{ padding: 0 }}>
        {item[k].map((r: string) => <li style={{ listStyle: 'none' }} key={r}><Link to={'/docs/' + r}>
            {k === 'backReferences' ? <>&#8592;&nbsp;{r}</> : <>{r}&nbsp;&#8594;</>}
        </Link></li>)}
    </ul>
}

const MasonrySearch: React.FC<{}> = () => {
    const documents = useAppSelector(state => state.documents);
    const drawings = useAppSelector(state => state.drawings);
    
    return <div>
        <Box sx={{ ml: '15px', mr: 1, paddingTop: '1em', pb: 1 }}>
            <Search render={(results, input) => {
                const resultsObj = results.reduce((prev, curr) => {
                    prev[curr.title] = curr.highlightedText;
                    return prev;
                }, {} as { [docKey: string]: React.ReactElement[][] })
                
                let drawingKeys = Object.keys(drawings)
                if (input) {
                    drawingKeys = drawingKeys.filter(d => d.includes(input));
                }
                const sorted = sortBy([
                    ...(input ? Object.keys(resultsObj) : Object.keys(documents)).map(dk => ({
                        key: dk,
                        type: 'doc' as const,
                        lastModified: documents[dk].lastUpdatedDate
                    })),
                    ...drawingKeys.map(drk => ({
                        key: drk,
                        type: 'draw' as const,
                        lastModified: drawings[drk].lastUpdatedDate
                    }))
                ], 'lastModified');
                
                return <Box sx={{ mr: -1, mt: 2 }}>
                    <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={1}>
                        {sorted.map((sortedItem, index) => {
                            if (sortedItem.type === 'doc') {
                                const docKey = sortedItem.key;
                                const item = documents[docKey];
                                return <Card key={'drawing:' + docKey}>
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div>{renderReferences('backReferences', item)}</div>
                                            <div style={{ textAlign: 'right' }}>{renderReferences('references', item)}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            }
                            const drawingKey = sortedItem.key;
                            const item = drawings[drawingKey];
                            return <Card key={'drawing:' + drawingKey}>
                                <CardHeader title={<Link to={'/drawings/' + item.name}>{item.name}</Link>} />
                                <CardContent>
                                    <ExcalidrawSvgImage drawingName={item.name} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div>{renderReferences('backReferences', item)}</div>
                                        <div />
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