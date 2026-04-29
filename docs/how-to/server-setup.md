# How-to: server-setup

**Účel tohoto dokumentu:** kompletní walkthrough pro fyzické připravení homelab Linux serveru pro factory. Wave 1 step 1.7 deliverable. Po dokončení máš running cloudflared tunnel, factory user, factory-core repo na serveru, secrets.env (s placeholders), a systemd units připravené (ale zatím neaktivované).

---

## 1. Předpoklady

Než začneš:

- **Linux server** s Ubuntu 22.04+ LTS nebo Debian 12+ (pro jiné distro řekni — skripty assume apt + systemd).
- **Sudo user** se jménem ne `root` ani `factory` (typicky tvoje login, např. `rychi`). Skripty volají `sudo` interně.
- **SSH klíč** přihlášený do `~/.ssh/authorized_keys` — `password` přihlášení vypni v `/etc/ssh/sshd_config` (`PasswordAuthentication no`).
- **Cloudflare účet** s registrovanou doménou `digitaldesigner.cz`.
- **Tailscale účet** (free tier — connect 100 zařízení, dostatečné).
- **GitHub účet** — repo `rychidesign/factory-core` musí být accessible (je public, ale token usnadní deploys).

Optional, ale doporučené:

- **UPS** — homelab outage je největší V1 risk.
- **Server IP fixed (DHCP reservation)** — Cloudflare Tunnel funguje bez fixní IP, ale Tailscale a SSH jsou snadnější.
- **`tree` utility** — `sudo apt install tree`, pro smoke test struktury.

---

## 2. Workflow

Tři skripty se postupně spustí. Každý je idempotent — re-run je bezpečný.

```
┌─────────────────────────────┐
│  scripts/server-setup.sh    │  factory user, dirs, deps, repo, secrets seed
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ scripts/install-cloudflared │  daemon, tunnel, DNS, systemd service
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ scripts/install-tailscale   │  emergency SSH backup
└──────────────┬──────────────┘
               ▼
        Manual: secrets.env populate
        Manual: Cloudflare Access policy
        Manual: install systemd unit files
               ▼
            Smoke test
```

---

## 3. Krok za krokem

### Krok 3.1 — Server provisioning

SSH na server jako tvůj sudo user:

```bash
ssh rychi@homelab-server     # nebo IP
```

Stáhni `server-setup.sh` a review:

```bash
curl -fsSLO https://raw.githubusercontent.com/rychidesign/factory-core/main/scripts/server-setup.sh
less server-setup.sh         # CTRL-V scroll, q ukončí
```

Spusť:

```bash
sudo bash server-setup.sh
```

Co skript dělá:

- Detekuje distro (Ubuntu/Debian).
- `apt install` base packages (curl, git, gnupg, build-essential, jq).
- Install Node.js 22 (přes NodeSource).
- Install pnpm 10.
- Vytvoří user `factory` s home `/home/factory/`.
- Enable systemd lingering pro `factory` (user units startují bez login).
- Vytvoří adresářovou strukturu:
  ```
  /home/factory/
  ├── factory-projects/
  │   ├── factory-core/         (z git clonu)
  │   └── clients/              (zatím prázdné)
  ├── factory-logs/             (zatím prázdné)
  └── .config/
      ├── factory/
      │   └── secrets.env       (z templatu)
      └── systemd/user/
  ```
- `git clone factory-core` jako `factory` user.
- `pnpm install` v factory-core (instaluje ajv, yaml, atd.).
- Vykopíruje `config/secrets.env.example` na `~/.config/factory/secrets.env` (chmod 600).
- Vytiskne next-steps shrnutí.

Po skončení skriptu `cd /home/factory/factory-projects` (jako sudo) a ověř:

```bash
sudo -u factory tree -L 2 /home/factory/factory-projects
# expect:
# factory-projects/
# ├── clients/
# └── factory-core/
#     ├── archetypes/
#     ├── ...
```

### Krok 3.2 — Cloudflare Tunnel

```bash
sudo bash /home/factory/factory-projects/factory-core/scripts/install-cloudflared.sh
```

Skript:

- Přidá Cloudflare apt repository.
- Install `cloudflared`.
- Vyzve k login do Cloudflare (vytiskne URL — otevři v prohlížeči, vyber zónu `digitaldesigner.cz`).
- Vytvoří tunnel `factory`.
- Napíše `/home/factory/.cloudflared/config.yml`:
  ```yaml
  tunnel: <tunnel-id>
  credentials-file: /home/factory/.cloudflared/<tunnel-id>.json
  ingress:
    - hostname: factory.digitaldesigner.cz
      service: http://localhost:3000
    - service: http_status:404
  ```
- Routuje DNS: `factory.digitaldesigner.cz` → tunnel.
- Instaluje cloudflared jako systemd service, enable + start.

Po skončení test ze tvého laptopu:

```bash
curl -I https://factory.digitaldesigner.cz
# Očekáváš: HTTP/2 502 (upstream connect error) — tunnel běží, dashboard zatím
# nemá co poslouchat na localhost:3000.
# NEBO: HTTP/2 530 — Cloudflare Access blokuje (config dál v 3.4).
```

Pokud `502`/`530` — tunnel funguje. Pokud `connection refused` nebo `DNS resolution failed` — debug:

```bash
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 50
```

### Krok 3.3 — Tailscale (emergency backup)

```bash
sudo bash /home/factory/factory-projects/factory-core/scripts/install-tailscale.sh
```

Skript:

- Install `tailscale` (přes oficiální install.sh).
- Volá `tailscale up --ssh --hostname=factory-server`.
- Vytiskne URL — otevři v prohlížeči, autorizuj v tvém Tailscale tenant.

Po skončení z laptopu (musí být ve tvém tailnet):

```bash
tailscale ping factory-server
# expect: pong from factory-server.<tenant>.ts.net via direct
```

```bash
ssh factory@factory-server
# nebo přes MagicDNS:
ssh factory@factory-server.<tenant>.ts.net
```

Tailscale je **emergency** — používáš jen pokud Cloudflare Access selže nebo dashboard je nedostupný. Day-to-day jdeš přes web.

### Krok 3.4 — Cloudflare Access policy

**Tohle je manuální** — Cloudflare API + CLI je pro Zero Trust komplikované, dashboard je rychlejší.

1. Otevři https://one.dash.cloudflare.com → vyber svůj tenant.
2. **Access → Applications → Add an application → Self-hosted**.
3. Vyplň:
   - **Application name:** `Factory dashboard`
   - **Session duration:** 24 hours
   - **Application domain:**
     - Subdomain: `factory`
     - Domain: `digitaldesigner.cz`
4. **Identity providers** — povolit `Google` (a `One-time PIN` jako fallback).
5. **Save**.
6. **Policies → Add a policy:**
   - **Policy name:** `Operator only`
   - **Action:** `Allow`
   - **Configure rules → Include → Emails:** `tvuj-email@gmail.com` (a další, pokud mají mít přístup).
7. **Save**.

Test: ze tvého laptopu otevři `https://factory.digitaldesigner.cz`. Cloudflare ti nabídne login → po Google auth dostaneš HTTP 502 (tunel funguje, dashboard zatím chybí).

### Krok 3.5 — Vyplnit secrets.env

```bash
sudo -u factory nano /home/factory/.config/factory/secrets.env
```

Vyplň (podle toho, co máš v ruce):

| Klíč | Kde najít | Wave kdy reálně potřeba |
|---|---|---|
| `OPENCODE_TOKEN` | https://opencode.ai/ → settings → API | Wave 3 |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | Wave 4 |
| `FIGMA_PERSONAL_ACCESS_TOKEN` | https://figma.com/settings → personal access | Wave 4 |
| `CLOUDFLARE_API_TOKEN` | dashboard → my profile → API tokens (template "Edit Cloudflare Workers" + Pages permission) | Wave 3 (deploy) |
| `CLOUDFLARE_ACCOUNT_ID` | dashboard right sidebar | Wave 3 |
| `SANITY_MANAGEMENT_TOKEN` | https://sanity.io/manage → tokens (Manage scope) | Wave 3 |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | BotFather + @userinfobot | Wave 5 |
| `GITHUB_TOKEN` | https://github.com/settings/tokens (classic, scope `repo` + `delete_repo`) | Wave 3 |

Nemusíš mít všechno teď — ostatní můžeš doplnit, až přijde příslušná wave. **Jen pro každý token, který vložíš, si zaznamenej do password manageru** (bitwarden, 1Password) jako disaster-recovery.

`chmod 600` na souboru by skript už měl zařídit, ověř:

```bash
ls -la /home/factory/.config/factory/secrets.env
# expect: -rw------- 1 factory factory ...
```

### Krok 3.6 — systemd unit files

Skripty unit files NEinstalovaly automaticky — chceme, abys nejdřív review:

```bash
ls /home/factory/factory-projects/factory-core/systemd/
# factory@.service  factory-dashboard.service  factory-monitor.service
```

Review:

```bash
less /home/factory/factory-projects/factory-core/systemd/factory@.service
```

Install:

```bash
sudo cp /home/factory/factory-projects/factory-core/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
```

**Neaktivovat zatím** — všechny tři units odkazují na binary, které ve V1 neexistují (orchestrator-runner ve Wave 3, dashboard ve Wave 5, monitor ve Wave 5).

```bash
# Verify only — neenable, nestart:
systemctl list-unit-files | grep factory
# factory@.service           static
# factory-dashboard.service  disabled
# factory-monitor.service    disabled
```

---

## 4. Smoke test (ROADMAP §1.7 exit criteria)

Po dokončení 3.1–3.6:

```bash
# 1. SSH jako factory user
sudo -u factory -i

# 2. Adresářová struktura
cd factory-projects && tree -L 2
# factory-projects/
# ├── clients/
# └── factory-core/
#     ├── archetypes/
#     ├── docs/
#     ├── ...

# 3. factory-core dependencies installed
ls factory-core/node_modules/.bin/ | grep -E "ajv|tsc"

# 4. Secrets file exists (jen jako root, kvůli chmod 600)
exit
sudo ls -la /home/factory/.config/factory/secrets.env

# 5. Cloudflare tunnel runs
sudo systemctl status cloudflared

# 6. From laptop:
curl -I https://factory.digitaldesigner.cz
# expect: HTTP/2 502 (upstream not yet listening) nebo
#         HTTP/2 200 + Cloudflare Access login screen, pokud Access policy aktivní

# 7. Tailscale up (z laptopu)
ssh factory@factory-server
# nebo přes MagicDNS
ssh factory@factory-server.<tenant>.ts.net
```

Všech 7 ✓ = **Wave 1 hotová**.

---

## 5. Co dál

Wave 2 (Intake MVP) probíhá v Claude Desktop, ne na serveru. Server v dalších waves dělá:

- **Wave 3** (factory skeleton): scp / git push prvního test spec na server, `factory new <project-id>` spustí `factory@<project-id>.service`.
- **Wave 5** (dashboard + monitor): build dashboard repu, deploy do `/home/factory/factory-dashboard/dist/`, enable `factory-dashboard.service` a `factory-monitor.service`.

---

## 6. Recovery / disaster

### Co dělat, pokud server umřel?

1. Nový server (nebo reinstall) — opakuj kroky 3.1–3.6.
2. State je v git — `git clone <project-repo>` do `/home/factory/factory-projects/clients/<id>`.
3. `factory resume <project-id>` (přijde v 3.4) → orchestrátor čte state.json, pokračuje od poslední iterace.

Jediné, co se neobnoví automaticky: secrets.env. Vyplň znova z password manageru.

### Co dělat, pokud Cloudflare outage?

1. SSH přes Tailscale: `ssh factory@factory-server.<tenant>.ts.net`.
2. Manage running factories: `sudo systemctl status factory@<id>`.
3. Když chceš dashboard přes Tailscale: `ssh -L 3000:localhost:3000 factory@factory-server.<tenant>.ts.net` → otevři `http://localhost:3000` v prohlížeči.

### Co dělat, pokud `cloudflared` službu nemůžeš restartovat?

Pravděpodobně cert.pem expired (cca 1 rok). Re-auth:

```bash
sudo -u factory cloudflared tunnel login   # browser flow
sudo systemctl restart cloudflared
```

---

## 7. Žádný change v server-setup nebo skriptech

Skripty v `scripts/` jsou idempotentní — bezpečné re-run. Pokud factory-core dostane update (např. nová packages.json dependency), pak na serveru:

```bash
sudo -u factory bash -c "cd ~/factory-projects/factory-core && git pull && pnpm install"
```

Není potřeba re-run server-setup (stejně skipne věci, které už existují).

Pokud přibude nová systemd unit (např. `factory-supervisor.service` v post-V1):

```bash
sudo cp /home/factory/factory-projects/factory-core/systemd/<new>.service /etc/systemd/system/
sudo systemctl daemon-reload
```

---

## 8. Známé gotchas

- **`loginctl enable-linger factory`** je nutný — bez něj user systemd units (kdybychom je chtěli) nestartují bez aktivního login. Skript to dělá automaticky.
- **`pnpm install` v server-setup** může zaseknout, pokud server má pomalý disk a npm mirror je daleko. Ne deal-breaker; lokální pnpm cache zrychlí druhý run.
- **Cloudflare Tunnel cert.pem expiruje cca po roce.** Když přestane fungovat za pár měsíců, re-run `cloudflared tunnel login`.
- **DNS routing** v `cloudflared tunnel route dns` selže, pokud subdoména už existuje jako CNAME mířící jinam. Tady tě skript varuje, ale neopraví — jdi do Cloudflare DNS dashboard, smaž starý record.
- **Tailscale free tier** je omezený na 100 zařízení / 3 users. Pro V1 (jen ty + server + telefon) dostatečné.
- **`secrets.env` s prázdnými hodnotami** je OK pro Wave 1 smoke test, ale agenty ve Wave 3+ budou failnout, dokud vyplníš relevantní tokeny.
