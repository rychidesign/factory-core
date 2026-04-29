#!/usr/bin/env bash
# Install Cloudflare Tunnel daemon (cloudflared), authenticate, create
# the factory tunnel and route factory.digitaldesigner.cz to it.
#
# Run AFTER server-setup.sh has finished. Two steps require interactive
# browser confirmation: `cloudflared tunnel login` and the optional
# Cloudflare Access policy creation.
#
# Usage: sudo bash scripts/install-cloudflared.sh

set -euo pipefail

FACTORY_USER="factory"
FACTORY_HOME="/home/${FACTORY_USER}"
TUNNEL_NAME="factory"
TUNNEL_HOSTNAME="factory.digitaldesigner.cz"
TUNNEL_LOCAL_TARGET="http://localhost:3000"
CLOUDFLARED_CONFIG_DIR="${FACTORY_HOME}/.cloudflared"
CLOUDFLARED_CONFIG_YML="${CLOUDFLARED_CONFIG_DIR}/config.yml"

log()  { printf '\033[1;34m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

require_sudo() {
  if [[ $EUID -ne 0 ]]; then
    die "Run with sudo: \`sudo bash $0\`"
  fi
}

ensure_factory_user() {
  if ! id -u "${FACTORY_USER}" >/dev/null 2>&1; then
    die "User '${FACTORY_USER}' does not exist. Run server-setup.sh first."
  fi
}

install_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    ok "cloudflared already installed: $(cloudflared --version | head -1)"
    return
  fi
  log "Adding Cloudflare apt repository…"
  mkdir -p /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | \
    tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/cloudflared.list
  log "Installing cloudflared…"
  apt-get update -qq
  apt-get install -y -qq cloudflared
  ok "cloudflared installed: $(cloudflared --version | head -1)"
}

prompt_login() {
  if [[ -f "${CLOUDFLARED_CONFIG_DIR}/cert.pem" ]]; then
    ok "Already authenticated (cert.pem present)."
    return
  fi
  cat <<EOF

────────────────────────────────────────────────────────
Cloudflare Tunnel needs you to log in.

The next command will print a URL — open it in your browser, log in to
Cloudflare, and pick the digitaldesigner.cz zone. The browser will
download a cert.pem to ~/.cloudflared/. Press Enter once done.
────────────────────────────────────────────────────────

EOF
  sudo -u "${FACTORY_USER}" mkdir -p "${CLOUDFLARED_CONFIG_DIR}"
  sudo -u "${FACTORY_USER}" cloudflared tunnel login
  if [[ ! -f "${CLOUDFLARED_CONFIG_DIR}/cert.pem" ]]; then
    die "Login did not produce ${CLOUDFLARED_CONFIG_DIR}/cert.pem. Re-run after browser flow completes."
  fi
  ok "Authenticated."
}

create_tunnel() {
  if [[ -f "${CLOUDFLARED_CONFIG_DIR}/${TUNNEL_NAME}.json" ]] || \
     sudo -u "${FACTORY_USER}" cloudflared tunnel list 2>/dev/null | grep -q "[[:space:]]${TUNNEL_NAME}[[:space:]]"; then
    ok "Tunnel '${TUNNEL_NAME}' already exists."
    return
  fi
  log "Creating tunnel '${TUNNEL_NAME}'…"
  sudo -u "${FACTORY_USER}" cloudflared tunnel create "${TUNNEL_NAME}"
  ok "Tunnel '${TUNNEL_NAME}' created."
}

write_config_yml() {
  if [[ -f "${CLOUDFLARED_CONFIG_YML}" ]]; then
    ok "${CLOUDFLARED_CONFIG_YML} already present (left untouched)."
    return
  fi
  log "Writing ${CLOUDFLARED_CONFIG_YML}…"
  local tunnel_id
  tunnel_id=$(sudo -u "${FACTORY_USER}" cloudflared tunnel list 2>/dev/null | \
              awk -v name="${TUNNEL_NAME}" '$2==name {print $1; exit}')
  if [[ -z "${tunnel_id}" ]]; then
    die "Could not resolve tunnel id for '${TUNNEL_NAME}'."
  fi
  cat > "${CLOUDFLARED_CONFIG_YML}" <<EOF
tunnel: ${tunnel_id}
credentials-file: ${CLOUDFLARED_CONFIG_DIR}/${tunnel_id}.json

ingress:
  - hostname: ${TUNNEL_HOSTNAME}
    service: ${TUNNEL_LOCAL_TARGET}
  - service: http_status:404
EOF
  chown "${FACTORY_USER}:${FACTORY_USER}" "${CLOUDFLARED_CONFIG_YML}"
  ok "Config written."
}

route_dns() {
  log "Routing ${TUNNEL_HOSTNAME} → tunnel '${TUNNEL_NAME}'…"
  sudo -u "${FACTORY_USER}" cloudflared tunnel route dns "${TUNNEL_NAME}" "${TUNNEL_HOSTNAME}" || \
    warn "DNS route may already exist (Cloudflare reports conflict). Verify in dashboard."
  ok "DNS route configured."
}

install_systemd_service() {
  log "Installing cloudflared as a system service…"
  cloudflared --config "${CLOUDFLARED_CONFIG_YML}" service install || true
  systemctl daemon-reload
  systemctl enable --now cloudflared
  sleep 2
  if systemctl is-active --quiet cloudflared; then
    ok "cloudflared service is active."
  else
    warn "cloudflared service did not become active. Check: systemctl status cloudflared"
  fi
}

print_next_steps() {
  cat <<EOF

────────────────────────────────────────────────────────
${0##*/}: cloudflared installed.
────────────────────────────────────────────────────────

Tunnel:    ${TUNNEL_NAME}
Hostname:  ${TUNNEL_HOSTNAME} → ${TUNNEL_LOCAL_TARGET}
Service:   systemctl status cloudflared

There is no application listening on localhost:3000 yet — the dashboard
ships in Wave 5. ${TUNNEL_HOSTNAME} should currently return HTTP 502
("upstream connect error"), which proves the tunnel itself is up.

Check from your laptop:
  curl -I https://${TUNNEL_HOSTNAME}
  # expected: HTTP/2 502 (or 530 if Cloudflare Access not yet configured)

Configure the Access policy at:
  https://one.dash.cloudflare.com → Access → Applications →
  Add a self-hosted application:
    Name:        Factory dashboard
    Subdomain:   factory
    Domain:      digitaldesigner.cz
    Policy:      Allow → Emails → your address(es)
    Identity:    Google (or one-time PIN)

EOF
}

main() {
  require_sudo
  ensure_factory_user
  install_cloudflared
  prompt_login
  create_tunnel
  write_config_yml
  route_dns
  install_systemd_service
  print_next_steps
}

main "$@"
