import { createRoot } from "react-dom/client";
import "./styles.css";
import { Palco } from "./Palco";

// Com uma só janela o evento "storage" não dispara sozinho: replicamos dentro da própria janela,
// para que painel e palco (agora na mesma tela) continuem se comunicando.
const si = Storage.prototype.setItem, ri = Storage.prototype.removeItem;
Storage.prototype.setItem = function (this: Storage, k: string, v: string) { si.call(this, k, v); dispatchEvent(new StorageEvent("storage", { key: k, newValue: String(v) })); };
Storage.prototype.removeItem = function (this: Storage, k: string) { ri.call(this, k); dispatchEvent(new StorageEvent("storage", { key: k, newValue: null })); };

createRoot(document.getElementById("root")!).render(<Palco />);
