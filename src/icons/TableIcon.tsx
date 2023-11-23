import { useTheme, SvgIcon } from "@mui/material";
import React from "react";
import TableSvg from "./table.svg?react";

const TableIcon: React.FC<{}> = (props) => {
  const theme = useTheme();
  const contrastColor = theme.palette.primary.main;
  return (
    <SvgIcon>
      <TableSvg fill={contrastColor} />
    </SvgIcon>
  );
};
export default TableIcon;
