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

type Settings = JsonObject;

@action({ UUID: "com.aaronholt.claude-usage.weekly-all" })
export class WeeklyAllAction extends SingletonAction<Settings> {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  override async onWillAppear(ev: WillAppearEvent<Settings>): Promise<void> {
    if (!ev.action.isKey()) return;
    await ev.action.setImage(renderLoading("7D ALL"));
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
      await action.setImage(renderError("7D ALL"));
      return;
    }
    const entry = findLimit(r.data, "weekly_all");
    const percent = entry?.percent ?? r.data.seven_day?.utilization;
    const resetsAt = entry?.resets_at ?? r.data.seven_day?.resets_at;
    if (typeof percent !== "number") {
      await action.setImage(renderError("7D ALL"));
      return;
    }
    await action.setImage(
      renderKey({
        big: formatPercent(percent),
        label: "7D ALL",
        subtitle: formatResetsIn(resetsAt),
        accent: percent > 80,
      })
    );
  }
}
