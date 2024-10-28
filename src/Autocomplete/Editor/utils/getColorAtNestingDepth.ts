import { Theme } from "@mui/material";
import hexRgb from "hex-rgb";

// depth starts at 1
const getColorAtNestingDepth = (theme: Theme, depth: number) => {
  console.assert(depth > 0);
  const dark = theme.palette.mode === "dark";
  const { red, green, blue } = hexRgb(theme.palette.background.default);
  let inc = 5;
  const change = inc * (depth - 1);
  const apply = (inamount: number) =>
    dark ? inamount + change : inamount - change;
  const rgb = `rgb(${apply(red)},${apply(green)},${apply(blue)})`;
  return rgb;
};
export default getColorAtNestingDepth;
