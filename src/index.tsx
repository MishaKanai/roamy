import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "setimmediate";
import App from "./App";
import "@fontsource/courier-prime";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import reportWebVitals from "./reportWebVitals";
import { Provider } from "react-redux";
import configureStore from "./store/configureStore";
import { PersistGate } from "redux-persist/integration/react";
import CssBaseline from "@mui/material/CssBaseline";
import { DropboxRemoteFilesProvider } from "./RemoteFiles/implementations/dropboxRemoteFiles";

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

const globalTheme = createTheme({
  palette: {
    mode: "dark",
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

const { store, persistor } = configureStore();

const InnerApp = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>
);
const rootElem = document.getElementById("root");

if (!persistor) {
  ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <InnerApp />
      </Provider>
    </React.StrictMode>,
    rootElem
  );
} else {
  ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <DropboxRemoteFilesProvider>
            <InnerApp />
          </DropboxRemoteFilesProvider>
        </PersistGate>
      </Provider>
    </React.StrictMode>,
    rootElem
  );
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
