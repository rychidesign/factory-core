#!/usr/bin/env bash
# Initial server provisioning for Rychi Design Factory.
#
# Run as a sudo-capable user (not as root, not as factory). The script
# creates the factory user, installs base dependencies, scaffolds the
# directory layout, clones factory-core, seeds secrets.env from the
# committed template.
#
# Idempotent: re-running is safe; existing user / directories / repo are
# left intact.
#
# Usage:
#   curl -fsSLO https://raw.githubusercontent.com/rychidesign/factory-core/main/scripts/server-setup.sh
#   less server-setup.sh   # review before running
#   sudo bash server-setup.sh
#
# Prerequisites verified at startup: Ubuntu 22.04+ / Debian 12+, sudo,
# outbound internet.

set -euo pipefail

FACTORY_USER="factory"
FACTORY_HOME="/home/${FACTORY_USER}"
FACTORY_PROJECTS="${FACTORY_HOME}/factory-projects"
FACTORY_CORE_REPO="https://github.com/rychidesign/factory-core.git"
FACTORY_CORE_DIR="${FACTORY_PROJECTS}/factory-core"
NODE_MAJOR="22"
PNPM_VERSION="10"

log()  { printf '\033[1;34m▶\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

require_sudo() {
  if [[ $EUID -ne 0 ]]; then
    die "Run with sudo: \`sudo bash $0\`"
  fi
}

require_distro() {
  if [[ ! -f /etc/os-release ]]; then
    die "Cannot detect distro (missing /etc/os-release)"
  fi
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) ok "Detected ${PRETTY_NAME}" ;;
    *) die "Unsupported distro: ${ID}. Script currently targets Ubuntu/Debian." ;;
  esac
}

ensure_packages() {
  log "Installing base packages…"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq \
    curl wget git ca-certificates gnupg lsb-release \
    build-essential jq
  ok "Base packages ready."
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && node -v | grep -qE "^v${NODE_MAJOR}\."; then
    ok "Node v${NODE_MAJOR} already installed: $(node -v)"
    return
  fi
  log "Installing Node.js v${NODE_MAJOR}…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
  ok "Node installed: $(node -v)"
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    ok "pnpm already installed: $(pnpm --version)"
    return
  fi
  log "Installing pnpm@${PNPM_VERSION}…"
  npm install -g "pnpm@${PNPM_VERSION}"
  ok "pnpm installed: $(pnpm --version)"
}

ensure_factory_user() {
  if id -u "${FACTORY_USER}" >/dev/null 2>&1; then
    ok "User '${FACTORY_USER}' already exists."
  else
    log "Creating user '${FACTORY_USER}'…"
    useradd -m -s /bin/bash "${FACTORY_USER}"
    ok "User '${FACTORY_USER}' created (home: ${FACTORY_HOME})."
  fi
  # Enable lingering so user systemd units start at boot without login.
  if ! loginctl show-user "${FACTORY_USER}" 2>/dev/null | grep -q 'Linger=yes'; then
    log "Enabling systemd lingering for '${FACTORY_USER}'…"
    loginctl enable-linger "${FACTORY_USER}"
    ok "Lingering enabled."
  fi
}

ensure_directories() {
  log "Scaffolding directory layout…"
  sudo -u "${FACTORY_USER}" mkdir -p \
    "${FACTORY_PROJECTS}" \
    "${FACTORY_PROJECTS}/clients" \
    "${FACTORY_HOME}/.config/factory" \
    "${FACTORY_HOME}/factory-logs" \
    "${FACTORY_HOME}/.config/systemd/user"
  chmod 700 "${FACTORY_HOME}/.config/factory"
  ok "Directories ready."
}

clone_factory_core() {
  if [[ -d "${FACTORY_CORE_DIR}/.git" ]]; then
    ok "factory-core already cloned at ${FACTORY_CORE_DIR}."
    log "Pulling latest…"
    sudo -u "${FACTORY_USER}" git -C "${FACTORY_CORE_DIR}" pull --ff-only origin main || \
      warn "git pull failed; manual review required."
    return
  fi
  log "Cloning factory-core…"
  sudo -u "${FACTORY_USER}" git clone "${FACTORY_CORE_REPO}" "${FACTORY_CORE_DIR}"
  ok "factory-core cloned."
}

install_factory_core_deps() {
  log "Installing factory-core dependencies (pnpm install)…"
  sudo -u "${FACTORY_USER}" bash -lc "cd '${FACTORY_CORE_DIR}' && pnpm install --silent"
  ok "Dependencies installed."
}

seed_secrets_env() {
  local target="${FACTORY_HOME}/.config/factory/secrets.env"
  if [[ -f "${target}" ]]; then
    ok "secrets.env already present (left untouched)."
    return
  fi
  local template="${FACTORY_CORE_DIR}/config/secrets.env.example"
  if [[ ! -f "${template}" ]]; then
    warn "secrets.env.example not found at ${template}. Skipping."
    return
  fi
  log "Seeding ~/.config/factory/secrets.env from template…"
  sudo -u "${FACTORY_USER}" cp "${template}" "${target}"
  chmod 600 "${target}"
  chown "${FACTORY_USER}:${FACTORY_USER}" "${target}"
  ok "secrets.env seeded with placeholders. Edit it before running any agent."
}

print_next_steps() {
  cat <<EOF

────────────────────────────────────────────────────────
${0##*/}: setup complete.
────────────────────────────────────────────────────────

Next steps (in order):

  1. Edit secrets:
       sudo -u ${FACTORY_USER} nano ${FACTORY_HOME}/.config/factory/secrets.env

  2. Install Cloudflare Tunnel + register the factory.digitaldesigner.cz route:
       sudo bash ${FACTORY_CORE_DIR}/scripts/install-cloudflared.sh

  3. Install Tailscale (emergency SSH backup):
       sudo bash ${FACTORY_CORE_DIR}/scripts/install-tailscale.sh

  4. Install systemd unit files (templates only — no project runs yet):
       sudo bash -c 'cp ${FACTORY_CORE_DIR}/systemd/*.service /etc/systemd/system/'
       sudo systemctl daemon-reload
       # The bash -c wrapper is required: glob expansion happens in your
       # shell, which can't read the factory user's home directory.

  5. Cloudflare Access policy (dashboard):
       https://one.dash.cloudflare.com → Access → Applications →
       Self-hosted "Factory dashboard" → factory.digitaldesigner.cz →
       allow only your email(s).

  6. Smoke test (after step 2 completes):
       sudo -u ${FACTORY_USER} -i
       cd factory-projects && tree -L 2
       systemctl --user status

See: ${FACTORY_CORE_DIR}/docs/how-to/server-setup.md

EOF
}

main() {
  require_sudo
  require_distro
  ensure_packages
  ensure_node
  ensure_pnpm
  ensure_factory_user
  ensure_directories
  clone_factory_core
  install_factory_core_deps
  seed_secrets_env
  print_next_steps
}

main "$@"
