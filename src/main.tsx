import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SiteAccessGate } from "@/components/SiteAccessGate.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SiteAccessGate>
    <App />
  </SiteAccessGate>,
);
