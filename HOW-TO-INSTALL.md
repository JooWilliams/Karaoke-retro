# How to install

Este guia explica como executar o Karaokê Gospel Retrô durante o desenvolvimento e como gerar os executáveis para Windows.

## Executar no computador de desenvolvimento

Instale o [Node.js](https://nodejs.org/) 20.19 ou superior (ou 22.12 ou superior) e, na pasta do projeto, execute:

```bash
npm install
npm run iniciar
```

Como alternativa, no Windows, execute `scripts\iniciar.bat`. O script instala as dependências se necessário e inicia o aplicativo.

O primeiro início também precisa baixar o executável do Electron. No Windows, se o download pelo Node falhar, o comando tenta novamente usando o `curl` do próprio Windows e verifica o arquivo antes de instalar. É necessário que a rede permita acesso aos arquivos de release do GitHub.

## Gerar o instalador para Windows

Na pasta do projeto, execute:

```bash
npm install
npm run dist
```

Os arquivos serão gerados na pasta `release`:

- **Instalador NSIS (`.exe`)**: execute o arquivo e siga as instruções para instalar o aplicativo no Windows.
- **Versão portátil (`.exe`)**: execute o arquivo diretamente, sem instalar.

O Node.js é necessário para gerar esses arquivos, mas não para usar o instalador ou a versão portátil em outro computador.
