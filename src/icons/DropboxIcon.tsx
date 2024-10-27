import { SvgIcon } from "@mui/material";
import React from "react";
import DropboxSvg from "./dropbox.svg?react";

const DropboxIcon: React.FC<{}> = (props) => {
  return (
    <SvgIcon color="inherit">
      <DropboxSvg />
    </SvgIcon>
  );
};
export default DropboxIcon;
