import { useActionMutation } from "@agent-native/core/client/hooks";
import { useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

export function meta() {
  return [{ title: "Google connection — TraceMind" }];
}

/**
 * Google OAuth callback page. Google redirects here with a one-time
 * state and code in the URL. This page sends those values through
 * the authenticated complete-google-connection action only; the
 * action's framework-authenticated user is the trusted identity,
 * never an email from the URL. On completion it navigates to a
 * fixed internal destination, clearing the code from the address
 * bar. If Google returned an error instead of a code, it navigates
 * to the generic denied destination without calling the action
 * and without forwarding any provider error detail.
 */
export default function GoogleCallbackRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const complete = useActionMutation("complete-google-connection", {
    onSuccess: (data) => {
      navigate(data.redirectTo, { replace: true });
    },
    onError: () => {
      navigate("/integrations?google=failed", { replace: true });
    },
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (searchParams.get("error")) {
      navigate("/integrations?google=denied", { replace: true });
      return;
    }
    const state = searchParams.get("state");
    const code = searchParams.get("code");
    if (!state || !code) {
      navigate("/integrations?google=failed", { replace: true });
      return;
    }
    // Strip the one-time code and state from the address bar and
    // browser history BEFORE the completion request runs, so the
    // sensitive URL does not linger in history or telemetry. The
    // values are already captured in memory above; nothing here
    // consumes the transaction, which only the authenticated
    // action does.
    window.history.replaceState(null, "", "/auth/google/callback");
    complete.mutate({ state, code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-full bg-[#0A0B10] text-[#ECEEF2]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-[#969CA9]">Completing your Google Cloud connection…</p>
        <p className="mt-2 text-sm">
          <Link className="text-[#5B8DEF]" to="/integrations">Return to Integrations</Link>
        </p>
      </div>
    </main>
  );
}
