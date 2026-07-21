# Claude Usage — Stream Deck plugin

Four Stream Deck keys mirroring the **Plan usage limits** panel on `claude.ai/settings/usage`:

| Key | Shows | Refresh |
|---|---|---|
| **Current Session** | `NN%` of your active 5-hour session + reset countdown | 3 min |
| **Weekly (All Models)** | `NN%` of your rolling 7-day all-models limit + reset countdown | 10 min |
| **Weekly (Scoped Model)** | `NN%` of the model-specific weekly limit your account has (Fable, Sonnet, etc — auto-labelled) | 10 min |
| **Extra Usage Credits** | `NN%` of your monthly extra credits + `used / limit` in your currency | 10 min |

The percentage flips to coral when over 80%. Tap any key to open `claude.ai/settings/usage` in your browser. If the data fetch fails, the key turns into a coral `!`.

The numbers come straight from Anthropic's own usage endpoint — the same data your Settings page shows.

## Install

### Requirements

- [Stream Deck app](https://www.elgato.com/downloads) 6.5 or newer (Windows 10+ or macOS 12+)
- **[Claude Code](https://docs.claude.com/en/docs/claude-code) installed and signed in on the same machine.** The plugin reads your OAuth token from `~/.claude/.credentials.json`, which Claude Code writes the first time you log in.

> ⚠️ **Claude Code is *not* the same product as Claude Desktop.** Claude Desktop (the chat app) stores credentials in your OS keychain, not in a JSON file, so the plugin can't read them. If you only have Claude Desktop installed, run `npm install -g @anthropic-ai/claude-code` and then `claude` to log in — that creates the file the plugin needs. Your Claude Desktop and claude.ai sign-ins are unaffected, and the limits Claude Code sees are the same account-wide limits the plugin will display.

### Install the packaged plugin

1. Download `com.aaronholt.claude-usage.streamDeckPlugin` from the Releases page (or build it yourself — see below).
2. Double-click. Stream Deck offers to install it.
3. In the Stream Deck app, find the **Claude Usage** category in the right sidebar.
4. Drag the four actions onto adjacent keys.

The session key fills in within a few seconds and refreshes every 3 minutes; the weekly keys check on a 10-minute schedule but ride along on the session refresh whenever it happens — one HTTP call covers all four, shared via an in-memory cache.

### Build from source

```bash
git clone https://github.com/darhkfox/streamdeckclaude
cd streamdeckclaude
npm install
npm run build
npx @elgato/cli pack com.aaronholt.claude-usage.sdPlugin
```

This produces `com.aaronholt.claude-usage.streamDeckPlugin` in the project root.

## How it works

On every refresh the plugin makes a single authenticated `GET` to:

```
https://api.anthropic.com/api/oauth/usage
Authorization: Bearer <accessToken from ~/.claude/.credentials.json>
anthropic-beta: oauth-2025-04-20
```

The response contains a `limits[]` array (with entries for `session`, `weekly_all`, and any `weekly_scoped` model-specific bucket your account has), a `spend` object for pay-as-you-go credits, and legacy top-level `five_hour` / `seven_day` fields for backwards compatibility. The plugin caches the response for 3 minutes and shares it across all four keys. If the access token is close to expiring, or a request returns 401, the plugin refreshes against `https://console.anthropic.com/v1/oauth/token` using the stored `refreshToken` and writes the new credentials back.

The endpoint is undocumented and heavily rate-limited, which is why polling is conservative (default: one shared HTTP call every 3 minutes).

## Privacy

The plugin only reads `~/.claude/.credentials.json` and only sends those credentials to `api.anthropic.com` and `console.anthropic.com` — the same servers Claude Code itself talks to. Nothing leaves your machine that wasn't already going to Anthropic.

## Limitations

- Classic Stream Deck devices only (MK.2, XL, Mini, Neo). Stream Deck Plus dial/touch-strip support is not implemented.
- Anthropic's usage endpoint is undocumented and may change or break without notice.
- The endpoint rate-limits aggressively if polled faster than ~once per minute. The default 3-minute cache stays well below that ceiling.

## Develop

```bash
npm install
npm run watch                                       # rebuild on save
streamdeck dev                                      # one-time, enables developer mode
streamdeck link com.aaronholt.claude-usage.sdPlugin
streamdeck restart com.aaronholt.claude-usage
streamdeck validate com.aaronholt.claude-usage.sdPlugin
```

After a code change, `streamdeck restart` reloads the manifest but does **not** kill the running Node child. Pick up TypeScript changes by also killing the plugin's `node.exe` process — Stream Deck respawns it with the new bundle.

Tunable constants live at the top of each `src/actions/*.ts` (refresh interval) and `src/usage.ts` (`CACHE_TTL_MS`).

## License

MIT — see [LICENSE](LICENSE).
