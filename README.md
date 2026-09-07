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

## Remote developers

For access outside the local network, use Tailscale. Install Tailscale on the
server computer and on each developer computer, sign them in to the same
Tailscale network, then start the server with `resources/app/run-server.bat`.
The developer opens the Tailscale IPv4 address of this computer:

```text
http://100.x.x.x:8081
```

The web app uses the address it was opened from, so the same build works over
the local network and Tailscale. Do not expose port 8081 directly on the
router.

For the Windows helper that also starts the client explorer, run
`resources/app/run-server.bat`. Set `VENOM_EXPLORER_HOST` and
`VENOM_EXPLORER_PORT` before launching it when the explorer is on another
computer.

## GitHub workflow

This folder is the working copy. Edit files here, run `npm run check`, then
commit and push the changes to the GitHub repository. Changes made on GitHub
do not update this Windows folder automatically; pull them with `git pull`.
