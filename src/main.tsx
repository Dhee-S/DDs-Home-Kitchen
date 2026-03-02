import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

const redirect = sessionStorage.redirect;
if (redirect) {
  sessionStorage.removeItem('redirect');
  window.history.replaceState(null, '', redirect);
}
