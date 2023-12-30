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
    resolutions.push({
      width: reducedWidth * factor,
      height: reducedHeight * factor,
    });
  }

  return resolutions;
}

// Example usage
const originalWidth = 1920; // Replace with your video's width
const originalHeight = 1080; // Replace with your video's height
const possibleResolutions = findResolutions(originalWidth, originalHeight);

console.log("Possible Resolutions:", possibleResolutions);

const ResolutionDialog: React.FC<{
  onSubmit: (resolution: [number, number]) => void;
  HeightToWidthRatio: number;
  sizeKb: number;
  originalWidth: number;
}> = ({ onSubmit, HeightToWidthRatio, originalWidth, sizeKb }) => {
  const [width, setWidth] = useState(originalWidth);
  const height = HeightToWidthRatio * width;
  const originalHeight = HeightToWidthRatio * originalWidth;

  const possibleResolutions = useMemo(
    () =>
      findResolutions(originalWidth, originalHeight).filter(
        // ffmpeg crashes on odd-pixeled resolutions
        ({ height, width }) => height % 2 === 0 && width % 2 === 0
      ),
    [originalWidth, originalHeight]
  );
  const marks = possibleResolutions.map((r) => {
    return {
      value: r.width,
    };
  });

  function valueLabelFormat(width: number) {
    return `${width} x ${width * HeightToWidthRatio}`;
  }

  return (
    <Dialog open>
      <DialogTitle>Shrink video size?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You may want to reduce the size of this video before uploading. It is
          currently <code>{sizeKb.toFixed(0)}KB</code>
        </DialogContentText>
        {`${width} x ${height}`}
        <div style={{ margin: "0 2em" }}>
          <Slider
            valueLabelFormat={valueLabelFormat}
            min={640}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onSubmit([originalWidth, originalHeight])}>
          Upload As-is
        </Button>
        {originalWidth > width && (
          <Button onClick={() => onSubmit([width, height])}>
            Compress to {`${width} x ${height}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ResolutionDialog;
