import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Captures `?ref=CODE` from any URL and persists it in localStorage for later attribution. */
export function RefCapture() {
  const loc = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const code = params.get("ref");
    if (code && code.length <= 64) localStorage.setItem("pm_ref_code", code);
  }, [loc.search]);
  return null;
}
