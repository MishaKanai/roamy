import React, { useEffect, useState } from "react";
import { Box, Drawer, IconButton, useTheme } from "@mui/material";
import { Close } from "@mui/icons-material";

const ResizableDrawer = ({
  open,
  onClose,
  children,
  isLg,
  isMobile,
  drawerSize,
  setDrawerSize,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  isLg: boolean;
  isMobile: boolean;
  drawerSize: number;
  setDrawerSize: (size: number) => void;
}) => {
  const theme = useTheme();
  // const [drawerSize, setDrawerSize] = useState(isMobile ? 200 : 400); // Initial size
  const [isDragging, setIsDragging] = useState(false);
  const [initialY, setInitialY] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setInitialY(e.clientY); // Store the initial Y position
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || initialY === null) return;

    if (isLg) {
      // Right-aligned drawer resizing
      const newWidth = window.innerWidth - e.clientX;
      setDrawerSize(Math.max(200, Math.min(newWidth, window.innerWidth - 100))); // Min 200px, max screen width - 100px
    } else {
      // Bottom-aligned drawer resizing
      const deltaY = initialY - e.clientY; // Reverse the direction: dragging up increases, dragging down decreases
      const newHeight = drawerSize + deltaY;
      setDrawerSize(
        Math.max(100, Math.min(newHeight, window.innerHeight - 50))
      ); // Min 100px, max screen height - 50px
      setInitialY(e.clientY); // Update the initial Y to the current position
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setInitialY(null); // Reset the initial Y position
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <Drawer
      variant="persistent"
      anchor={isLg ? "right" : "bottom"}
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          overflow: "visible",
          left: !isLg && !isMobile ? "unset" : undefined,
          width: isLg
            ? `${drawerSize}px`
            : isMobile
            ? "100%"
            : "calc(100% - 220px)", // Right drawer width
          height: isLg ? "100%" : `${drawerSize}px`, // Bottom drawer height
        },
      }}
    >
      <Box
        pl={1}
        height="100%"
        display="flex"
        flexDirection="column"
        position="relative"
      >
        {/* Scrollable Content Container */}
        <Box
          sx={{
            height: "100%", // Ensure it fills the drawer space
            overflow: "auto", // Enable scrolling for content
          }}
        >
          {children}
        </Box>

        {/* Resize Handle */}
        <Box
          sx={{
            position: "absolute",
            top: isLg ? 0 : -10, // Place handle above the drawer for bottom alignment
            bottom: isLg ? "auto" : "unset",
            right: isLg ? "auto" : 0,
            left: isLg ? 0 : "auto",
            width: isLg ? "10px" : "100%", // Wider handle for right drawer, full width for bottom drawer
            height: isLg ? "100%" : "10px", // Taller handle for bottom drawer
            cursor: isLg ? "ew-resize" : "ns-resize", // Horizontal/Vertical cursor
            backgroundColor: "transparent", // Ensure the handle area is not visually intrusive
            zIndex: 1, // Ensure the handle is on top of other elements
          }}
          onMouseDown={handleMouseDown}
        />

        {/* Close Button Tab */}
        <Box
          sx={{
            position: "absolute",
            top: isLg ? "1em" : -16, // For bottom drawer, position above the top edge
            left: isLg ? -16 : undefined, // For right drawer, position to the left of the top-left edge
            right: isLg ? undefined : 16,
            transform: isLg ? "translateX(-100%)" : "translateY(-100%)",
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: 1,
            zIndex: 2, // Ensure the tab is above everything else
          }}
        >
          <IconButton
            style={{
              backgroundColor:
                theme.palette.mode === "dark" ? "#1E1E1E" : "background.paper",
            }}
            color="inherit"
            size="small"
            onClick={onClose}
          >
            <Close sx={{ color: "white" }} />
          </IconButton>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ResizableDrawer;
