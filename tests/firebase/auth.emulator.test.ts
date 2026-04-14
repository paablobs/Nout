import { describe, expect, it } from "vitest";

describe("Firebase Auth emulator", () => {
  it("creates an anonymous user and returns tokens", async () => {
    const response = await fetch(
      "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnSecureToken: true,
        }),
      },
    );

    expect(response.ok).toBe(true);

    const payload = (await response.json()) as {
      localId?: string;
      idToken?: string;
      refreshToken?: string;
    };

    expect(payload.localId).toBeTypeOf("string");
    expect(payload.idToken).toBeTypeOf("string");
    expect(payload.refreshToken).toBeTypeOf("string");
  });
});
