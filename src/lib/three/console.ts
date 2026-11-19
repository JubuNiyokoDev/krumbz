import { getConsoleFunction, setConsoleFunction } from "three";

let installed = false;

/**
 * @react-three/fiber 9.8 still instantiates THREE.Clock, deprecated since
 * three r183, which logs a warning for every canvas. That message is
 * third-party noise we cannot act on: drop it, forward everything else.
 */
export function installThreeConsoleFilter() {
  if (installed) return;
  installed = true;
  const previous = getConsoleFunction();
  setConsoleFunction((level: "log" | "warn" | "error", message: string, ...params: unknown[]) => {
    if (level === "warn" && typeof message === "string" && message.includes("Clock: This module has been deprecated")) return;
    if (previous) {
      previous(level, message, ...params);
      return;
    }
    const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    method(message, ...params);
  });
}
