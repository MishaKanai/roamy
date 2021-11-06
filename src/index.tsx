import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import "@fontsource/courier-prime"
import { createTheme, ThemeProvider } from '@mui/material/styles';
import reportWebVitals from "./reportWebVitals";
import { Provider } from "react-redux";
import configureStore from "./store/configureStore";
import { PersistGate } from "redux-persist/integration/react";
import CssBaseline from '@mui/material/CssBaseline';

const globalTheme = createTheme({
  palette: {
    mode: 'dark'
  },
  typography: {
    fontFamily: "Courier Prime"
  }
})
const theme = createTheme({
  components: {
    MUIDataTable: {
      styleOverrides: {
        paper: {
          boxShadow: "none",
          backgroundColor: 'transparent',
          backgroundImage: 'none'
        }
      }
    } as any,
  } as any
}, globalTheme)

const { store, persistor } = configureStore();

ReactDOM.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
            <App />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
