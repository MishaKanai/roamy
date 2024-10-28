import { CssBaseline, IconButton, PaletteMode } from "@mui/material";
import React, { useContext, useMemo } from "react";
import "@fontsource/courier-prime";
import { createTheme, ThemeProvider, useTheme } from "@mui/material/styles";
import { DarkModeOutlined, LightModeOutlined } from "@mui/icons-material";

const extraComponents: any = {
  MUIDataTable: {
    styleOverrides: {
      paper: {
        boxShadow: "none",
        backgroundColor: "transparent",
        backgroundImage: "none",
      },
    },
  },
};

const getTheme = (mode: PaletteMode) => {
  const globalTheme = createTheme({
    palette: {
      mode,
      background:
        mode === "dark"
          ? {}
          : {
              default: "#f5f7fa",
              paper: "#f8fafc",
            },
    },
    typography: {
      fontFamily: "Courier Prime",
    },
  });
  const theme = createTheme(
    {
      components: {
        MuiFab: {
          styleOverrides: {
            root: {
              textTransform: "capitalize",
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: "capitalize",
            },
          },
        },
        MuiListItemText: {
          styleOverrides: {
            root: {
              overflowWrap: "break-word",
            },
          },
        },
        ...extraComponents,
      },
    },
    globalTheme
  );
  return theme;
};

interface ThemeContext {
  togglePaletteMode: () => void;
}
const defaultContext: ThemeContext = {
  togglePaletteMode() {},
};
const themeControlContext = React.createContext<ThemeContext>(defaultContext);

export const TogglePaletteMode = () => {
  const { togglePaletteMode } = useContext(themeControlContext);
  const mode = useTheme().palette.mode;
  return (
    <IconButton
      size="small"
      aria-label={`Toggle ${mode} mode`}
      onClick={togglePaletteMode}
    >
      {mode === "light" ? <DarkModeOutlined /> : <LightModeOutlined />}
    </IconButton>
  );
};

export const ControlledTheme: React.FC<{}> = (props) => {
  const storedMode = localStorage.getItem("paletteMode") as PaletteMode;
  const [mode, setMode] = React.useState<PaletteMode>(storedMode || "light");
  const theme = React.useMemo(() => getTheme(mode), [mode]);
  // Toggle and persist the mode
  const togglePaletteMode = React.useCallback(() => {
    setMode((prev) => {
      const newMode = prev === "light" ? "dark" : "light";
      localStorage.setItem("paletteMode", newMode); // Persist to localStorage
      return newMode;
    });
  }, []);

  const context: ThemeContext = useMemo(() => {
    return {
      togglePaletteMode,
    };
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <themeControlContext.Provider value={context}>
        {props.children}
      </themeControlContext.Provider>
    </ThemeProvider>
  );
};
