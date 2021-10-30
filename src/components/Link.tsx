import React, { useContext } from 'react';
import { Link as RouterLink, LinkProps } from 'react-router-dom';
import { mergeContext } from '../dropbox/resolveMerge/components/ResolveConflicts2';

const Link: React.FC<LinkProps> = props => {
    const inMerge = useContext(mergeContext);
    if (inMerge.inMergeContext) {
        return <span>{props.children}</span>
    }
    return <RouterLink {...props} />;
}
export default Link;
