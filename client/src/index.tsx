import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App";
import { store } from "./store";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#f28c00",
      light: "#ffb74d",
      dark: "#d97706",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#1f5fa8",
      light: "#4c84c4",
      dark: "#174a84",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f5f7fb",
      paper: "#ffffff",
    },
    divider: "#d8e0ea",
    text: {
      primary: "#1f2d3d",
      secondary: "#4f6278",
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"Segoe UI", "Roboto", "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif',
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontSize: "1.03rem",
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
);
