import { useTheme, SvgIcon } from '@mui/material';
import React from 'react';
import { ReactComponent as TableSvg } from './table.svg';

const TableIcon: React.FC<{}> = props => {
    const theme = useTheme();
    const contrastColor = theme.palette.primary.main;
    return <SvgIcon>
        <TableSvg fill={contrastColor} />
    </SvgIcon>
}
export default TableIcon;