import { useTheme, SvgIcon } from '@mui/material';
import React from 'react';
import { ReactComponent as DropboxSvg } from './dropbox.svg';

const DropboxIcon: React.FC<{}> = props => {
    const theme = useTheme();
    const contrastColor = theme.palette.primary.main;
    return <SvgIcon>
        <DropboxSvg fill={contrastColor} />
    </SvgIcon>
}
export default DropboxIcon;