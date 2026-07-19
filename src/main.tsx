import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./lib/router";
import { watchBootSplashDismissal } from "./startup/boot-splash";
import "./styles/globals.css";

void watchBootSplashDismissal();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
