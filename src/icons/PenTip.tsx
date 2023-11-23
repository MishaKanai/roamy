import { useTheme, SvgIcon } from "@mui/material";
import React from "react";
import PenTipSvg from "./pen-tip.svg?react";

const PenTipIcon: React.FC<{}> = (props) => {
  const theme = useTheme();
  const contrastColor = theme.palette.primary.main;
  return (
    <SvgIcon>
      <PenTipSvg fill={contrastColor} />
    </SvgIcon>
  );
};
export default PenTipIcon;
