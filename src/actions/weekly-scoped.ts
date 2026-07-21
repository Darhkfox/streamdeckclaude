import {
  action,
  SingletonAction,
  type JsonObject,
  type KeyAction,
  type KeyDownEvent,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import { findLimit, getUsage, invalidateUsageCache } from "../usage.js";
import { formatPercent, formatResetsIn, renderError, renderKey, renderLoading } from "../render.js";
import { openSettings } from "../open-settings.js";

const REFRESH_MS = 10 * 60_000;
const FALLBACK_LABEL = "MODEL";

type Settings = JsonObject;

function labelFor(name: string | null | undefined): string {
  if (!name) return FALLBACK_LABEL;
  return name.toUpperCase().slice(0, 10);
}

@action({ UUID: "com.aaronholt.claude-usage.weekly-scoped" })
export class WeeklyScopedAction extends SingletonAction<Settings> {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    if (!ev.action.isKey()) return;
    await ev.action.setImage(renderLoading(FALLBACK_LABEL));
    await this.tick(ev.action);
    const t = setInterval(() => {
      void this.tick(ev.action as KeyAction<Settings>);
    }, REFRESH_MS);
    this.timers.set(ev.action.id, t);
  }

  override onWillDisappear(ev: WillDisappearEvent<Settings>): void {
    const t = this.timers.get(ev.action.id);
    if (t) clearInterval(t);
    this.timers.delete(ev.action.id);
  }

  override async onKeyDown(ev: KeyDownEvent<Settings>): Promise<void> {
    invalidateUsageCache();
    if (ev.action.isKey()) void this.tick(ev.action);
    await openSettings();
  }

  private async tick(action: KeyAction<Settings>): Promise<void> {
    const r = await getUsage();
    if (!r.ok) {
      await action.setImage(renderError(FALLBACK_LABEL));
      return;
    }
    const entry = findLimit(r.data, "weekly_scoped");
    if (!entry) {
      // No scoped model bucket on this account — show 0% so the key isn't
      // stuck in error state.
      await action.setImage(
        renderKey({ big: "—", label: FALLBACK_LABEL, subtitle: "none active" })
      );
      return;
    }
    const label = "7D " + labelFor(entry.scope?.model?.display_name);
    await action.setImage(
      renderKey({
        big: formatPercent(entry.percent),
        label,
        subtitle: formatResetsIn(entry.resets_at),
        accent: entry.percent > 80,
      })
    );
  }
}
