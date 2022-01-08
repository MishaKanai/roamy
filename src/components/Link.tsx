import React, { useContext } from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';
import mergeContext from '../dropbox/resolveMerge/mergeContext';
import MuiLink from '@mui/material/Link';
const Link: React.FC<LinkProps> = props => {
    const inMerge = useContext(mergeContext);
    if (inMerge.inMergeContext) {
        return <span>{props.children}</span>
    }
    return <MuiLink component={RouterLink as any} {...(props as any)} />
}
export default Link;
