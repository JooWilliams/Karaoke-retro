const { app, BrowserWindow, screen, session } = require("electron");
const path = require("path");

app.whenReady().then(() => {
  // Libera apenas o microfone
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === "media"));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => perm === "media");

  // Uma única janela: tela cheia na segunda tela (TV/projetor) se houver; senão, janela comum.
  const principal = screen.getPrimaryDisplay();
  const externa = screen.getAllDisplays().find((d) => d.id !== principal.id);
  const alvo = externa || principal;
  const win = new BrowserWindow({
    x: alvo.bounds.x, y: alvo.bounds.y,
    width: externa ? alvo.bounds.width : 1280, height: externa ? alvo.bounds.height : 720,
    fullscreen: !!externa, autoHideMenuBar: true, title: "Karaokê Gospel Retrô",
    webPreferences: { autoplayPolicy: "no-user-gesture-required" },
  });
  const url = process.env.ELECTRON_START_URL;
  if (url) win.loadURL(url); else win.loadFile(path.join(__dirname, "../dist/index.html"));
});
app.on("window-all-closed", () => app.quit());
