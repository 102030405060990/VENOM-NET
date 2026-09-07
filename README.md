# VENOM NET

## Development on Windows

Install Node.js, then open PowerShell in the project root:

```powershell
npm install --prefix resources/app
npm run check
npm run dev
```

The server is available at `http://localhost:8081`. The `dev` command watches
the source files under `resources/app` and prints syntax and runtime errors in
the same terminal.

For the Windows helper that also starts the client explorer, run
`resources/app/run-server.bat`. Set `VENOM_EXPLORER_HOST` and
`VENOM_EXPLORER_PORT` before launching it when the explorer is on another
computer.

## GitHub workflow

This folder is the working copy. Edit files here, run `npm run check`, then
commit and push the changes to the GitHub repository. Changes made on GitHub
do not update this Windows folder automatically; pull them with `git pull`.
