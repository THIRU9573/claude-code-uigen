import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

// Mock server-only to allow imports in test environment
vi.mock("server-only", () => ({}));

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock jose
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

// Import after mocks are set up
const { createSession } = await import("../auth");

describe("createSession", () => {
  let mockCookieStore: any;
  let mockSignJWT: any;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup cookie store mock
    mockCookieStore = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    };

    (cookies as any).mockResolvedValue(mockCookieStore);

    // Setup SignJWT mock chain
    mockSignJWT = {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue("mock-jwt-token-12345"),
    };

    (SignJWT as any).mockImplementation(() => mockSignJWT);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Basic Functionality", () => {
    it("creates a session with valid userId and email", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      await createSession(userId, email);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-123",
          email: "test@example.com",
          expiresAt: expect.any(Date),
        })
      );
    });

    it("generates a JWT token", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockSignJWT.sign).toHaveBeenCalled();
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-jwt-token-12345",
        expect.any(Object)
      );
    });

    it("sets cookie with the generated token", async () => {
      await createSession("user-456", "user@test.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });
  });

  describe("JWT Configuration", () => {
    it("uses HS256 algorithm", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
    });

    it("sets 7 day expiration time", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith("7d");
    });

    it("sets issued at timestamp", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
    });

    it("calls JWT methods in correct order", async () => {
      const callOrder: string[] = [];

      mockSignJWT.setProtectedHeader.mockImplementation(function (this: any) {
        callOrder.push("setProtectedHeader");
        return this;
      });
      mockSignJWT.setExpirationTime.mockImplementation(function (this: any) {
        callOrder.push("setExpirationTime");
        return this;
      });
      mockSignJWT.setIssuedAt.mockImplementation(function (this: any) {
        callOrder.push("setIssuedAt");
        return this;
      });
      mockSignJWT.sign.mockImplementation(() => {
        callOrder.push("sign");
        return Promise.resolve("token");
      });

      await createSession("user-123", "test@example.com");

      expect(callOrder).toEqual([
        "setProtectedHeader",
        "setExpirationTime",
        "setIssuedAt",
        "sign",
      ]);
    });
  });

  describe("Cookie Configuration", () => {
    it("sets httpOnly flag to true", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ httpOnly: true })
      );
    });

    it("sets sameSite to lax", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ sameSite: "lax" })
      );
    });

    it("sets path to root", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ path: "/" })
      );
    });

    it("sets cookie name to auth-token", async () => {
      await createSession("user-123", "test@example.com");

      const cookieName = mockCookieStore.set.mock.calls[0][0];
      expect(cookieName).toBe("auth-token");
    });
  });

  describe("Environment-specific Behavior", () => {
    it("sets secure flag to true in production", async () => {
      process.env.NODE_ENV = "production";

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ secure: true })
      );
    });

    it("sets secure flag to false in development", async () => {
      process.env.NODE_ENV = "development";

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ secure: false })
      );
    });

    it("sets secure flag to false in test", async () => {
      process.env.NODE_ENV = "test";

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ secure: false })
      );
    });

    it("handles undefined NODE_ENV", async () => {
      delete process.env.NODE_ENV;

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({ secure: false })
      );
    });
  });

  describe("Expiration Time", () => {
    it("sets expiration to 7 days from now", async () => {
      const beforeTime = Date.now();

      await createSession("user-123", "test@example.com");

      const afterTime = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      const setCall = mockCookieStore.set.mock.calls[0];
      const expiresAt = setCall[2].expires;

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTime + sevenDays);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterTime + sevenDays + 1000);
    });

    it("includes expiresAt in JWT payload", async () => {
      const beforeTime = Date.now();

      await createSession("user-123", "test@example.com");

      const afterTime = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      const signJWTCall = (SignJWT as any).mock.calls[0][0];
      const expiresAt = signJWTCall.expiresAt;

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTime + sevenDays);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterTime + sevenDays + 1000);
    });

    it("uses same expiration for JWT and cookie", async () => {
      await createSession("user-123", "test@example.com");

      const jwtPayload = (SignJWT as any).mock.calls[0][0];
      const cookieOptions = mockCookieStore.set.mock.calls[0][2];

      expect(jwtPayload.expiresAt).toBe(cookieOptions.expires);
    });
  });

  describe("User ID Variations", () => {
    it("handles UUID format user IDs", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";

      await createSession(uuid, "test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ userId: uuid })
      );
    });

    it("handles numeric user IDs", async () => {
      const numericId = "12345";

      await createSession(numericId, "test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ userId: numericId })
      );
    });

    it("handles user IDs with special characters", async () => {
      const specialId = "user-123!@#$%";

      await createSession(specialId, "test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ userId: specialId })
      );
    });

    it("handles very long user IDs", async () => {
      const longId = "a".repeat(500);

      await createSession(longId, "test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ userId: longId })
      );
    });

    it("handles empty user ID", async () => {
      await createSession("", "test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "" })
      );
    });
  });

  describe("Email Variations", () => {
    it("handles standard email format", async () => {
      await createSession("user-123", "user@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: "user@example.com" })
      );
    });

    it("handles email with subdomain", async () => {
      await createSession("user-123", "user@mail.example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: "user@mail.example.com" })
      );
    });

    it("handles email with plus sign", async () => {
      await createSession("user-123", "user+test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: "user+test@example.com" })
      );
    });

    it("handles email with dots", async () => {
      await createSession("user-123", "first.last@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: "first.last@example.com" })
      );
    });

    it("handles very long email", async () => {
      const longEmail = "a".repeat(50) + "@example.com";

      await createSession("user-123", longEmail);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: longEmail })
      );
    });

    it("handles empty email", async () => {
      await createSession("user-123", "");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: "" })
      );
    });

    it("handles email with numbers", async () => {
      await createSession("user-123", "user123@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({ email: "user123@example.com" })
      );
    });
  });

  describe("Error Handling", () => {
    it("throws error when JWT signing fails", async () => {
      mockSignJWT.sign.mockRejectedValue(new Error("Signing failed"));

      await expect(createSession("user-123", "test@example.com")).rejects.toThrow(
        "Signing failed"
      );
    });

    it("throws error when cookie setting fails", async () => {
      mockCookieStore.set.mockImplementation(() => {
        throw new Error("Cookie error");
      });

      await expect(createSession("user-123", "test@example.com")).rejects.toThrow(
        "Cookie error"
      );
    });

    it("throws error when cookies() fails", async () => {
      (cookies as any).mockRejectedValue(new Error("Cookies unavailable"));

      await expect(createSession("user-123", "test@example.com")).rejects.toThrow(
        "Cookies unavailable"
      );
    });

    it("handles JWT secret encoding error", async () => {
      mockSignJWT.sign.mockRejectedValue(new Error("Invalid secret"));

      await expect(createSession("user-123", "test@example.com")).rejects.toThrow(
        "Invalid secret"
      );
    });
  });

  describe("Multiple Session Creation", () => {
    it("creates multiple sessions sequentially", async () => {
      await createSession("user-1", "user1@example.com");
      await createSession("user-2", "user2@example.com");
      await createSession("user-3", "user3@example.com");

      expect(SignJWT).toHaveBeenCalledTimes(3);
      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);
    });

    it("creates sessions with different tokens", async () => {
      let tokenCounter = 0;
      mockSignJWT.sign.mockImplementation(() => {
        tokenCounter++;
        return Promise.resolve(`token-${tokenCounter}`);
      });

      await createSession("user-1", "user1@example.com");
      await createSession("user-2", "user2@example.com");

      const token1 = mockCookieStore.set.mock.calls[0][1];
      const token2 = mockCookieStore.set.mock.calls[1][1];

      expect(token1).toBe("token-1");
      expect(token2).toBe("token-2");
      expect(token1).not.toBe(token2);
    });

    it("overwrites previous session for same user", async () => {
      await createSession("user-123", "test@example.com");
      await createSession("user-123", "test@example.com");

      // Both should set the same cookie name (overwriting)
      expect(mockCookieStore.set).toHaveBeenCalledTimes(2);
      expect(mockCookieStore.set.mock.calls[0][0]).toBe("auth-token");
      expect(mockCookieStore.set.mock.calls[1][0]).toBe("auth-token");
    });
  });

  describe("Payload Structure", () => {
    it("includes all required fields in payload", async () => {
      await createSession("user-123", "test@example.com");

      const payload = (SignJWT as any).mock.calls[0][0];

      expect(payload).toHaveProperty("userId");
      expect(payload).toHaveProperty("email");
      expect(payload).toHaveProperty("expiresAt");
    });

    it("does not include additional fields", async () => {
      await createSession("user-123", "test@example.com");

      const payload = (SignJWT as any).mock.calls[0][0];
      const keys = Object.keys(payload);

      expect(keys).toHaveLength(3);
      expect(keys).toContain("userId");
      expect(keys).toContain("email");
      expect(keys).toContain("expiresAt");
    });

    it("preserves data types in payload", async () => {
      await createSession("user-123", "test@example.com");

      const payload = (SignJWT as any).mock.calls[0][0];

      expect(typeof payload.userId).toBe("string");
      expect(typeof payload.email).toBe("string");
      expect(payload.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe("Integration Scenarios", () => {
    it("successfully completes full session creation flow", async () => {
      const userId = "integration-user";
      const email = "integration@test.com";

      await createSession(userId, email);

      // Verify JWT creation
      expect(SignJWT).toHaveBeenCalled();
      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalled();
      expect(mockSignJWT.setExpirationTime).toHaveBeenCalled();
      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
      expect(mockSignJWT.sign).toHaveBeenCalled();

      // Verify cookie setting
      expect(cookies).toHaveBeenCalled();
      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          expires: expect.any(Date),
        })
      );
    });

    it("handles rapid session creation", async () => {
      const promises = [
        createSession("user-1", "user1@example.com"),
        createSession("user-2", "user2@example.com"),
        createSession("user-3", "user3@example.com"),
      ];

      await Promise.all(promises);

      expect(SignJWT).toHaveBeenCalledTimes(3);
      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);
    });
  });
});
