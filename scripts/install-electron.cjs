const { spawnSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const electronDirectory = path.dirname(require.resolve("electron/package.json"));
const installScript = path.join(electronDirectory, "install.js");
const nativeInstall = spawnSync(process.execPath, [installScript], { stdio: "inherit" });

if (nativeInstall.status === 0) {
  process.exit(0);
}

if (process.platform !== "win32") {
  process.exit(nativeInstall.status || 1);
}

async function installWithCurl() {
  const { version } = require(path.join(electronDirectory, "package.json"));
  const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
  const arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;
  const fileName = `electron-v${version}-${platform}-${arch}.zip`;
  const url = `https://github.com/electron/electron/releases/download/v${version}/${fileName}`;
  const parsedUrl = new URL(url);
  parsedUrl.pathname = path.posix.dirname(parsedUrl.pathname);
  const cacheDirectory = createHash("sha256").update(parsedUrl.toString()).digest("hex");
  const cacheRoot = process.env.electron_config_cache
    || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"), "electron", "Cache");
  const archivePath = path.join(cacheRoot, cacheDirectory, fileName);

  console.log("O download pelo Node falhou; tentando baixar o Electron com o curl do Windows.");
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });

  const curl = spawnSync("curl.exe", [
    "--fail",
    "--location",
    "--retry", "3",
    "--retry-delay", "2",
    "--connect-timeout", "30",
    "--output", archivePath,
    url,
  ], { stdio: "inherit" });

  if (curl.error || curl.status !== 0) {
    fs.rmSync(archivePath, { force: true });
    throw curl.error || new Error(`curl.exe terminou com o código ${curl.status}`);
  }

  const checksums = require(path.join(electronDirectory, "checksums.json"));
  const expectedChecksum = checksums[fileName];
  if (!expectedChecksum) {
    fs.rmSync(archivePath, { force: true });
    throw new Error(`Não há checksum publicado para ${fileName}.`);
  }

  const hash = createHash("sha256");
  for await (const chunk of fs.createReadStream(archivePath)) {
    hash.update(chunk);
  }
  if (hash.digest("hex") !== expectedChecksum) {
    fs.rmSync(archivePath, { force: true });
    throw new Error("O checksum do download do Electron não confere; o arquivo foi removido.");
  }

  const retry = spawnSync(process.execPath, [installScript], { stdio: "inherit" });
  if (retry.status !== 0) {
    throw retry.error || new Error(`A instalação do Electron terminou com o código ${retry.status}.`);
  }
}

installWithCurl().catch((error) => {
  console.error("Não foi possível instalar o Electron:", error.message);
  process.exitCode = 1;
});
