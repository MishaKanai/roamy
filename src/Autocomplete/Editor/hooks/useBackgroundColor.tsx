import { useTheme } from "@mui/material";
import { useContext } from "react";
import nestedEditorContext from "../../nestedEditorContext";
import getColorAtNestingDepth from "../utils/getColorAtNestingDepth";

const useBackgroundColor = (changeAmount: number = 0) => {
    const theme = useTheme();
    const nestingDepth = useContext(nestedEditorContext).length + changeAmount;
    return getColorAtNestingDepth(theme, nestingDepth);
}
export default useBackgroundColor;