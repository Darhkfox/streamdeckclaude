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

const REFRESH_MS = 3 * 60_000;

type Settings = JsonObject;

@action({ UUID: "com.aaronholt.claude-usage.current" })
export class CurrentSessionAction extends SingletonAction<Settings> {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    if (!ev.action.isKey()) return;
    await ev.action.setImage(renderLoading("SESSION"));
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
    // Tap forces a fresh fetch — useful for recovery after sleep — and
    // opens the Settings page. Fire both in parallel so the user isn't
    // waiting on the network call.
    invalidateUsageCache();
    if (ev.action.isKey()) void this.tick(ev.action);
    await openSettings();
  }

  private async tick(action: KeyAction<Settings>): Promise<void> {
    const r = await getUsage();
    if (!r.ok) {
      await action.setImage(renderError("SESSION"));
      return;
    }
    const entry = findLimit(r.data, "session");
    const percent = entry?.percent ?? r.data.five_hour?.utilization;
    const resetsAt = entry?.resets_at ?? r.data.five_hour?.resets_at;
    if (typeof percent !== "number") {
      await action.setImage(renderError("SESSION"));
      return;
    }
    await action.setImage(
      renderKey({
        big: formatPercent(percent),
        label: "SESSION",
        subtitle: formatResetsIn(resetsAt),
        accent: percent > 80,
      })
    );
  }
}
