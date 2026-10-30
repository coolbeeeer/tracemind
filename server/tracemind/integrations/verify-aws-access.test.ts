import { describe, expect, it, vi } from "vitest";
import { verifyAwsLoggingAccess } from "./verify-aws-access.js";

const credentials = {
  accessKeyId: "AKIDEXAMPLE123456789",
  secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
};

describe("AWS logging access probe", () => {
  it("reports authorized on a successful empty read", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ events: [] }), {
      status: 200, headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    const result = await verifyAwsLoggingAccess({
      region: "ap-south-1",
      logGroupName: "/aws/lambda/payments",
      credentials,
      request,
    });
    expect(result.authorized).toBe(true);
  });

  it("rejects when CloudWatch denies the read", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({}), {
      status: 403, headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
    await expect(
      verifyAwsLoggingAccess({
        region: "ap-south-1",
        logGroupName: "/aws/lambda/payments",
        credentials,
        request,
      }),
    ).rejects.toThrow(/HTTP 403/);
  });
});
