import { describe, expect, it } from "vitest";
import { isPrivateAddress, validateRemoteHttpUrl } from "./safeUrl";

describe("safe remote URLs", () => {
  it.each(["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "::1"])(
    "recognizes %s as private",
    (address) => {
      expect(isPrivateAddress(address)).toBe(true);
    }
  );

  it("rejects local URLs", async () => {
    await expect(validateRemoteHttpUrl("http://localhost/image.png")).rejects.toThrow(
      /private|local/i
    );
  });

  it("rejects embedded credentials and non-standard ports", async () => {
    await expect(
      validateRemoteHttpUrl("https://user:pass@example.com/image.png")
    ).rejects.toThrow(/credentials/i);
    await expect(
      validateRemoteHttpUrl("https://example.com:8443/image.png")
    ).rejects.toThrow(/ports/i);
  });
});
