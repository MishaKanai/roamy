import React, { useCallback, useContext } from "react";
import { setTitle } from "../../../SlateGraph/store/slateDocumentsSlice";
import mergeContext from "../mergeContext";
import { Checkbox, FormControlLabel, TextField } from "@mui/material";
import { css } from "@emotion/css";

interface MergeTitleProps {
  docName: string;
  left: string;
  right: string;
  curr: string;
}
const MergeTitle: React.FC<MergeTitleProps> = ({
  left,
  right,
  curr,
  docName,
}) => {
  const mergeCtxt = useContext(mergeContext);
  if (!mergeCtxt.inMergeContext) {
    throw new Error("MergeTitle outside of merge context");
  }
  const mrgDispatch = mergeCtxt.dispatch;

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        mrgDispatch(
          setTitle({
            name: docName,
            displayName: e.target.value,
          })
        );
      }
    },
    [mrgDispatch, docName]
  );

  const handleLeftCheck = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        mrgDispatch(
          setTitle({
            name: docName,
            displayName: left,
          })
        );
      }
    },
    [mrgDispatch, left, docName]
  );

  const handleRightCheck = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        mrgDispatch(
          setTitle({
            name: docName,
            displayName: right,
          })
        );
      }
    },
    [mrgDispatch, right, docName]
  );

  return (
    <div
      className={css`
        display: flex;
        width: 100%;
      `}
    >
      <FormControlLabel
        control={
          <Checkbox
            checked={curr === left}
            onChange={handleLeftCheck}
            name="left"
          />
        }
        label="Use Ours"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={curr === right}
            onChange={handleRightCheck}
            name="right"
          />
        }
        label="Use Theirs"
      />
      <div
        className={css`
          flex: 1;
        `}
      >
        <TextField value={curr} onChange={handleTitleChange} label="Title" />
      </div>
    </div>
  );
};
export default MergeTitle;
