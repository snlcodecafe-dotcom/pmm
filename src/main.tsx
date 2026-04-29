import { Buffer } from "buffer";
// Polyfill Buffer for Solana / Metaplex libs
if (typeof window !== "undefined" && !window.Buffer) {
  (window as any).Buffer = Buffer;
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
