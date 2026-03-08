import log from "loglevel";

// IMPORTANT: use import.meta.env.PROD (Vite) not process.env.NODE_ENV (Node-only, always undefined in browser/Vite).
log.setLevel(import.meta.env.PROD ? "warn" : "trace");

export default log;
