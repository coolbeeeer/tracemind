import { defineAppConfig } from "@agent-native/core/server";

export default defineAppConfig({
  app: {
    // This name appears in transactional emails. Change it to your product name.
    name: "Tracemind",
    // The source template keeps a renamed app from inheriting first-party email branding.
    sourceTemplate: "chat",
    // TraceMind's authenticated entry is the Overview Dashboard (Phase 1).
    // The template Get started page stays at /home, and chat stays at /chat.
    homePath: "/overview",
    // Optional: use your own absolute HTTPS logo URL in transactional emails.
    // logoUrl: "https://example.com/logo.png",
  },
});
