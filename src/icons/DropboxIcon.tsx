import { useTheme, SvgIcon } from "@mui/material";
import React from "react";
import DropboxSvg from "./dropbox.svg?react";

const DropboxIcon: React.FC<{}> = (props) => {
  const theme = useTheme();
  const contrastColor = theme.palette.primary.main;
  return (
    <SvgIcon>
      <DropboxSvg fill={contrastColor} />
    </SvgIcon>
  );
};
export default DropboxIcon;
