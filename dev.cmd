@echo off
set "NODE_BIN=C:\Users\anchu\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
set "PNPM=C:\Users\anchu\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\pnpm.cmd"
set "PATH=%NODE_BIN%;%PATH%"
set "CI=true"
call "%PNPM%" run dev -- --host 127.0.0.1
