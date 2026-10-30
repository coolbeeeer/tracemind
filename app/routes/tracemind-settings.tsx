import {
  actionErrorMessage,
  useActionQuery,
} from "@agent-native/core/client/hooks";
import { useState } from "react";

import { DemoBadge } from "@/components/tracemind/badges";
import { DemoBanner } from "@/components/tracemind/dashboard-bits";

export function meta() {
  return [{ title: "TraceMind Settings — TraceMind" }];
}

const inputClass =
  "rounded-lg border border-[#2B2E36] bg-[#101114] px-3 py-2 text-sm text-[#ECEEF2] outline-none focus:border-[#5B8DEF]";

interface SettingsState {
  checkInterval: string;
  errorThreshold: string;
  monitored: Record<string, boolean>;
  alertCritical: boolean;
  alertWarning: boolean;
  notifyEmail: boolean;
  notifySlack: boolean;
  notifyWebhook: boolean;
  notificationEmail: string;
  requireApproval: boolean;
  allowReadCode: boolean;
  allowModifyCode: boolean;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#5B8DEF]"
      />
    </label>
  );
}

export default function TraceMindSettingsRoute() {
  const servicesQuery = useActionQuery("list-services", {});
  const services = servicesQuery.data?.services ?? [];

  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [resetNote, setResetNote] = useState(false);

  // Initialise session state from the demo services once, without
  // claiming any of it is persisted.
  const current: SettingsState =
    settings ??
    ({
      checkInterval: "60",
      errorThreshold: "5",
      monitored: Object.fromEntries(
        services.map((service) => [service.id, service.monitoringEnabled]),
      ),
      alertCritical: true,
      alertWarning: true,
      notifyEmail: false,
      notifySlack: false,
      notifyWebhook: false,
      notificationEmail: "",
      requireApproval: true,
      allowReadCode: true,
      allowModifyCode: false,
    } as SettingsState);

  const set = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K],
  ) => {
    setSettings((prev) => ({ ...(prev ?? current), [key]: value }));
    setResetNote(false);
  };

  const reset = () => {
    setSettings(null);
    setResetNote(true);
  };

  return (
    <main className="min-h-full bg-[#101114] text-[#ECEEF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#5B8DEF]">
              Settings
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              TraceMind settings
            </h1>
            <p className="mt-1 text-sm text-[#969CA9]">
              This page lives at /tracemind-settings, not /settings, because
              /settings is owned by the Agent-Native template.
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="mt-5">
          <DemoBanner />
        </div>

        <div className="mt-5 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-4 py-3">
          <p className="text-sm font-medium">Session-only settings</p>
          <p className="mt-1 text-sm text-[#ECEEF2]">
            Every control on this page works in this session only. Nothing
            here is saved to a backend, and no change here affects live
            monitoring, notifications, or investigation safety until the
            backend developer provides persistence. Closing or reloading
            the page discards these values.
          </p>
          {resetNote ? (
            <p className="mt-2 text-sm text-[#FBBF24]">
              Reset to session defaults.
            </p>
          ) : null}
        </div>

        {servicesQuery.error ? (
          <div className="mt-5 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#F87171]">
            {actionErrorMessage(servicesQuery.error) ??
              "Could not load services for monitoring settings. Please try again."}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
            <h2 className="text-sm font-semibold">Monitoring configuration</h2>
            <div className="mt-3 space-y-3 text-sm">
              <label className="block">
                <span className="text-[#969CA9]">Health check interval</span>
                <select
                  value={current.checkInterval}
                  onChange={(event) => set("checkInterval", event.target.value)}
                  aria-label="Health check interval"
                  className={`${inputClass} mt-1 block w-full`}
                >
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every 1 minute</option>
                  <option value="300">Every 5 minutes</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[#969CA9]">
                  Error-rate alert threshold (%)
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={current.errorThreshold}
                  onChange={(event) => set("errorThreshold", event.target.value)}
                  aria-label="Error-rate alert threshold"
                  className={`${inputClass} mt-1 block w-full`}
                />
              </label>
              <div>
                <p className="text-[#969CA9]">Services monitored (session only)</p>
                {services.length === 0 ? (
                  <p className="mt-2 text-sm text-[#969CA9]">
                    No services loaded yet.
                  </p>
                ) : (
                  services.map((service) => (
                    <Toggle
                      key={service.id}
                      checked={current.monitored[service.id] ?? false}
                      onChange={(checked) =>
                        set("monitored", {
                          ...current.monitored,
                          [service.id]: checked,
                        })
                      }
                      label={service.name}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4">
            <h2 className="text-sm font-semibold">Notification preferences</h2>
            <p className="mt-2 text-xs text-[#969CA9]">
              No notification channel is connected in demo mode. Turning
              these on does not send any email, message, or webhook.
            </p>
            <div className="mt-2 divide-y divide-[#2B2E36]">
              <Toggle
                checked={current.alertCritical}
                onChange={(checked) => set("alertCritical", checked)}
                label="Alert on critical incidents"
              />
              <Toggle
                checked={current.alertWarning}
                onChange={(checked) => set("alertWarning", checked)}
                label="Alert on warning incidents"
              />
              <Toggle
                checked={current.notifyEmail}
                onChange={(checked) => set("notifyEmail", checked)}
                label="Notify by email (not connected)"
              />
              <Toggle
                checked={current.notifySlack}
                onChange={(checked) => set("notifySlack", checked)}
                label="Notify by Slack (not connected)"
              />
              <Toggle
                checked={current.notifyWebhook}
                onChange={(checked) => set("notifyWebhook", checked)}
                label="Notify by webhook (not connected)"
              />
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-[#969CA9]">Notification email (session only)</span>
              <input
                type="email"
                value={current.notificationEmail}
                onChange={(event) => set("notificationEmail", event.target.value)}
                placeholder="you@example.com"
                aria-label="Notification email"
                className={`${inputClass} mt-1 block w-full`}
              />
            </label>
          </section>

          <section className="rounded-xl border border-[#2B2E36] bg-[#181A20] p-4 lg:col-span-2">
            <h2 className="text-sm font-semibold">Investigation safety controls</h2>
            <p className="mt-2 text-xs text-[#969CA9]">
              These toggles express intent only. Backend enforcement is
              required before any of them can actually constrain an agent,
              and no toggle here permits a fix to be applied on its own.
            </p>
            <div className="mt-2 divide-y divide-[#2B2E36] text-sm">
              <Toggle
                checked={current.requireApproval}
                onChange={(checked) => set("requireApproval", checked)}
                label="Require human approval before any fix is applied"
              />
              <Toggle
                checked={current.allowReadCode}
                onChange={(checked) => set("allowReadCode", checked)}
                label="Allow the investigation agent to read code"
              />
              <Toggle
                checked={current.allowModifyCode}
                onChange={(checked) => set("allowModifyCode", checked)}
                label="Allow the investigation agent to modify code (backend-gated, off by default)"
              />
            </div>
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-lg border border-[#2B2E36] px-3 py-2 text-sm text-[#969CA9] hover:text-[#ECEEF2]"
            >
              Reset to session defaults
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
