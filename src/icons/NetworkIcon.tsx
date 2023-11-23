import { useTheme, SvgIcon } from "@mui/material";
import React from "react";
import NetworkSvg from "./network.svg?react";

const NetworkIcon: React.FC<{}> = (props) => {
  const theme = useTheme();
  const contrastColor = theme.palette.primary.main;
  return (
    <SvgIcon>
      <NetworkSvg fill={contrastColor} />
    </SvgIcon>
  );
};
export default NetworkIcon;
