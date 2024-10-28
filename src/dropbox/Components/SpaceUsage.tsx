import React, { useEffect, useState } from "react";
import { Dropbox, users } from "dropbox";
import useDbx from "../hooks/useDbx";
import { Box, LinearProgress, Typography } from "@mui/material";

interface SpaceUsageProps {}

const SpaceUsage: React.FC<SpaceUsageProps> = () => {
  const [usedSpace, setUsedSpace] = useState<number | null>(null);
  const [totalSpace, setTotalSpace] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dbx = useDbx();
  useEffect(() => {
    if (!dbx) return;
    const fetchSpaceUsage = async () => {
      try {
        const spaceUsage = await dbx.usersGetSpaceUsage();
        const { used, allocation } = spaceUsage.result as users.SpaceUsage;

        setUsedSpace(used);

        if (allocation[".tag"] === "individual") {
          setTotalSpace(allocation.allocated);
        } else if (allocation[".tag"] === "team") {
          setTotalSpace(allocation.allocated);
        }
      } catch (err) {
        setError("Failed to fetch space usage");
        console.error(err);
      }
    };

    fetchSpaceUsage();
  }, [dbx]);

  if (error) {
    return <div>{error}</div>;
  }

  if (usedSpace === null || totalSpace === null) {
    return <div>Loading...</div>;
  }

  const usedPercentage = (usedSpace / totalSpace) * 100;

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Dropbox Storage
      </Typography>
      <Box display="flex" alignItems="center">
        <Box sx={{ width: "80%", mr: 2 }}>
          <LinearProgress variant="determinate" value={usedPercentage} />
        </Box>
        <Box>
          <Typography variant="body2" color="textSecondary">
            {usedPercentage.toFixed(2)}%
          </Typography>
        </Box>
      </Box>
      <Box mt={1}>
        <Typography variant="body2" color="textSecondary">
          {(usedSpace / 1024 ** 3).toFixed(2)} GB /{" "}
          {(totalSpace / 1024 ** 3).toFixed(0)} GB
        </Typography>
      </Box>
    </Box>
  );
};

export default SpaceUsage;
