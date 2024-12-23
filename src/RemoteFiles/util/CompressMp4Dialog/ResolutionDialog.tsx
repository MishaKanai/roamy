import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Slider,
} from "@mui/material";
import React, { useMemo, useState } from "react";

function findResolutions(
  originalWidth: number,
  originalHeight: number
): { width: number; height: number }[] {
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // Calculate the greatest common divisor (GCD) of the original dimensions
  const commonDivisor = gcd(originalWidth, originalHeight);

  // Calculate reduced width and height
  const reducedWidth = originalWidth / commonDivisor;
  const reducedHeight = originalHeight / commonDivisor;

  const resolutions = [];

  // Loop to find all integer multiples of the reduced dimensions
  // that are less than or equal to the original dimensions
  for (
    let factor = 1;
    reducedWidth * factor <= originalWidth &&
    reducedHeight * factor <= originalHeight;
    factor++
  ) {
    const width = Math.round(reducedWidth * factor);
    const height = Math.round(reducedHeight * factor);
    resolutions.push({
      width,
      height,
    });
  }

  return resolutions;
}

const ResolutionDialog: React.FC<{
  onSubmit: (resolution: [number, number]) => void;
  HeightToWidthRatio: number;
  sizeKb: number;
  originalWidth: number;
}> = ({
  onSubmit,
  HeightToWidthRatio,
  originalWidth: _originalWidth,
  sizeKb,
}) => {
  const originalWidth = Math.round(_originalWidth);

  const [width, setWidth] = useState(originalWidth);
  const height = Math.round(HeightToWidthRatio * width);
  const originalHeight = Math.round(HeightToWidthRatio * originalWidth);

  const possibleResolutions = useMemo(
    () =>
      findResolutions(originalWidth, originalHeight).filter(
        // ffmpeg crashes on odd-pixeled resolutions
        ({ height, width }) => height % 2 === 0 && width % 2 === 0
      ),
    [originalWidth, originalHeight]
  );

  const MIN_WIDTH = 480;

  const minResolutionAboveMin = possibleResolutions
    .filter(({ width }) => width >= MIN_WIDTH)
    .reduce(
      (prev, curr) => {
        if (curr.width < prev.width) {
          return curr;
        }
        return prev;
      },
      { height: Math.round(originalHeight), width: Math.round(originalWidth) }
    );
  const marks = possibleResolutions.map((r) => {
    return {
      value: r.width,
    };
  });

  function valueLabelFormat(width: number) {
    return `${width} x ${Math.round(width * HeightToWidthRatio)}`;
  }

  return (
    <Dialog open>
      <DialogTitle>Shrink video size?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You may want to reduce the size of this video before uploading. It is
          currently <code>{sizeKb.toFixed(0)}KB</code>
        </DialogContentText>
        {minResolutionAboveMin.width < originalWidth && (
          <>
            {`${width} x ${height}`}
            <div style={{ margin: "0 3em" }}>
              <Slider
                valueLabelFormat={valueLabelFormat}
                min={minResolutionAboveMin.width}
                value={width}
                max={originalWidth}
                onChange={(event, newValue) => setWidth(newValue as number)}
                marks={marks}
                step={null}
                aria-label="Video Width"
                defaultValue={originalWidth}
                valueLabelDisplay="auto"
              />
            </div>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onSubmit([originalWidth, originalHeight])}>
          Upload As-is
        </Button>
        <Button variant="contained" onClick={() => onSubmit([width, height])}>
          Compress
          {originalWidth > width && <span> to {`${width} x ${height}`}</span>}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ResolutionDialog;
