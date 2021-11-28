import { useTheme, SvgIcon } from '@mui/material';
import React from 'react';
import { ReactComponent as DocumentSvg } from './document.svg';

const DocumentIcon: React.FC<{}> = props => {
    const theme = useTheme();
    const contrastColor = theme.palette.primary.main;
    return <SvgIcon>
        <DocumentSvg fill={contrastColor} />
    </SvgIcon>
}
export default DocumentIcon;