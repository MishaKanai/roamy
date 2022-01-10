import React from 'react';
import { useSelector } from 'react-redux';
import Card from '@mui/material/Card';
import Masonry from '@mui/lab/Masonry';
import { Node } from 'slate';
import { CardContent, CardHeader } from '@mui/material';
import { RootState } from '../../store/createRootReducer';
import sum from 'sum';
import Link from '../../components/Link';

const serialize = (nodes: any[]) => {
  return nodes.map(n => Node.string(n)).join('\n')
}

const MasonrySearch: React.FC<{}> = () => {
    const documents = useSelector((state: RootState) => {
        return state.documents
    });
    return <Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={1}>
        {Object.values(documents).map((item, index) => (
            <Card key={index}>
                <CardHeader title={<Link to={'/docs/' + item.name}>{item.name}</Link>} />
                <CardContent>
                    {(() => {
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
                            <ul>
                                {item.backReferences.map(r => <li  style={{ listStyle: 'none' }} key={r}><Link to={'/docs/' + r}>&#8592;&nbsp;{r}</Link></li>)}
                            </ul>
                        </div>
                        <div style={{ textAlign: 'right'}}>
                            <ul>
                                {item.references.map(r => <li style={{ listStyle: 'none' }} key={r}><Link to={'/docs/' + r}>{r}&nbsp;&#8594;</Link></li>)}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
    </Masonry>
}
export default MasonrySearch;