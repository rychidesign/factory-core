#!/usr/bin/env bash
# Install Tailscale as an emergency SSH backup channel for when Cloudflare
# is unavailable. The login step opens a URL in the browser — accept it
# from your laptop / phone Tailscale account so the server joins your tailnet.
#
# Usage: sudo bash scripts/install-tailscale.sh

set -euo pipefail

log()  { printf '\033[1;34m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

require_sudo() {
  if [[ $EUID -ne 0 ]]; then
    die "Run with sudo: \`sudo bash $0\`"
  fi
}

install_tailscale() {
  if command -v tailscale >/dev/null 2>&1; then
    ok "tailscale already installed: $(tailscale version | head -1)"
    return
  fi
  log "Installing tailscale…"
  curl -fsSL https://tailscale.com/install.sh | sh
  ok "tailscale installed: $(tailscale version | head -1)"
}

login_tailscale() {
  if tailscale status >/dev/null 2>&1; then
    ok "Tailscale already authenticated."
    # `head -n 3` would close the pipe early and trip set -o pipefail.
    # `sed -n '1,3p'` reads to EOF and prints the first three lines.
    tailscale status | sed -n '1,3p'
    return
  fi
  cat <<'EOF'

────────────────────────────────────────────────────────
The next command will print a URL. Open it in your browser, sign in
to Tailscale, and authorise this machine. You may also use --authkey
if you prefer non-interactive flow (see Tailscale admin → Keys).
────────────────────────────────────────────────────────

EOF
  # `tailscale up` blocks until the URL is approved.
  tailscale up --ssh --hostname=factory-server
  ok "Tailscale up."
  tailscale status | sed -n '1,3p'
}

print_next_steps() {
  local ts_ip
  ts_ip=$(tailscale ip -4 2>/dev/null | head -1 || echo "<run \`tailscale ip\`>")
  cat <<EOF

────────────────────────────────────────────────────────
${0##*/}: Tailscale ready.
────────────────────────────────────────────────────────

Tailnet IP:   ${ts_ip}
Hostname:     factory-server
SSH from any device in your tailnet:
  ssh factory@factory-server
  # or with MagicDNS:
  ssh factory@factory-server.<your-tailnet>.ts.net

This is the emergency SSH path if Cloudflare Access ever blocks the
dashboard or the homelab loses public connectivity. Day-to-day you
will not use it.

Disable when not in active use:
  sudo tailscale down

Re-enable:
  sudo tailscale up

EOF
}

main() {
  require_sudo
  install_tailscale
  login_tailscale
  print_next_steps
}

main "$@"
