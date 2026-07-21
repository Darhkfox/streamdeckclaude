import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { verifyUsage } from "./usage.js";
import { CurrentSessionAction } from "./actions/current-session.js";
import { WeeklyAllAction } from "./actions/weekly-all.js";
import { WeeklyScopedAction } from "./actions/weekly-scoped.js";
import { ExtraUsageAction } from "./actions/extra-usage.js";

streamDeck.logger.setLevel(LogLevel.INFO);

streamDeck.actions.registerAction(new CurrentSessionAction());
streamDeck.actions.registerAction(new WeeklyAllAction());
streamDeck.actions.registerAction(new WeeklyScopedAction());
streamDeck.actions.registerAction(new ExtraUsageAction());

void verifyUsage();

streamDeck.connect();
