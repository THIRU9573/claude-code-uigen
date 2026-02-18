import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

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
const { createSession, getSession, deleteSession, verifySession } = await import("../auth");

describe("auth", () => {
  let mockCookieStore: any;
  let mockSignJWT: any;

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
      sign: vi.fn().mockResolvedValue("mock-jwt-token"),
    };

    (SignJWT as any).mockImplementation(() => mockSignJWT);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSession", () => {
    it("creates a JWT token with correct payload", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      await createSession(userId, email);

      // Verify SignJWT was called with correct payload
      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          email,
          expiresAt: expect.any(Date),
        })
      );
    });

    it("sets JWT with correct algorithm and expiration", async () => {
      await createSession("user-123", "test@example.com");

      expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
      expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith("7d");
      expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
      expect(mockSignJWT.sign).toHaveBeenCalled();
    });

    it("sets cookie with correct options", async () => {
      const userId = "user-123";
      const email = "test@example.com";

      await createSession(userId, email);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-jwt-token",
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          expires: expect.any(Date),
        })
      );
    });

    it("sets secure flag in production", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-jwt-token",
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("does not set secure flag in development", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      await createSession("user-123", "test@example.com");

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        "auth-token",
        "mock-jwt-token",
        expect.objectContaining({
          secure: false,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("sets expiration to 7 days from now", async () => {
      const beforeTime = Date.now();

      await createSession("user-123", "test@example.com");

      const afterTime = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      const setCall = mockCookieStore.set.mock.calls[0];
      const expiresAt = setCall[2].expires;

      // Check expiration is approximately 7 days from now (within 1 second tolerance)
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTime + sevenDays);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterTime + sevenDays + 1000);
    });
  });

  describe("getSession", () => {
    it("returns session payload when token is valid", async () => {
      const mockPayload = {
        userId: "user-123",
        email: "test@example.com",
        expiresAt: new Date(),
      };

      mockCookieStore.get.mockReturnValue({ value: "valid-token" });
      (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

      const session = await getSession();

      expect(session).toEqual(mockPayload);
      expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
      // Verify jwtVerify was called with the token and a secret
      expect(jwtVerify).toHaveBeenCalled();
      const jwtVerifyCall = (jwtVerify as any).mock.calls[0];
      expect(jwtVerifyCall[0]).toBe("valid-token");
      expect(jwtVerifyCall[1]).toBeDefined(); // JWT secret
    });

    it("returns null when no token exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const session = await getSession();

      expect(session).toBeNull();
      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it("returns null when token verification fails", async () => {
      mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
      (jwtVerify as any).mockRejectedValue(new Error("Invalid token"));

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("returns null when token is expired", async () => {
      mockCookieStore.get.mockReturnValue({ value: "expired-token" });
      (jwtVerify as any).mockRejectedValue(new Error("Token expired"));

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("handles malformed tokens gracefully", async () => {
      mockCookieStore.get.mockReturnValue({ value: "malformed-token" });
      (jwtVerify as any).mockRejectedValue(new Error("JWS verification failed"));

      const session = await getSession();

      expect(session).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("deletes the auth cookie", async () => {
      await deleteSession();

      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });

    it("calls cookies() to get cookie store", async () => {
      await deleteSession();

      expect(cookies).toHaveBeenCalled();
    });
  });

  describe("verifySession", () => {
    it("returns session payload when token is valid", async () => {
      const mockPayload = {
        userId: "user-456",
        email: "user@example.com",
        expiresAt: new Date(),
      };

      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "valid-token" }),
        },
      } as unknown as NextRequest;

      (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

      const session = await verifySession(mockRequest);

      expect(session).toEqual(mockPayload);
      expect(mockRequest.cookies.get).toHaveBeenCalledWith("auth-token");
      // Verify jwtVerify was called with the token and a secret
      expect(jwtVerify).toHaveBeenCalled();
      const jwtVerifyCall = (jwtVerify as any).mock.calls[0];
      expect(jwtVerifyCall[0]).toBe("valid-token");
      expect(jwtVerifyCall[1]).toBeDefined(); // JWT secret
    });

    it("returns null when no token in request", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as NextRequest;

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it("returns null when token verification fails", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "invalid-token" }),
        },
      } as unknown as NextRequest;

      (jwtVerify as any).mockRejectedValue(new Error("Invalid signature"));

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    it("handles expired tokens gracefully", async () => {
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "expired-token" }),
        },
      } as unknown as NextRequest;

      (jwtVerify as any).mockRejectedValue(new Error("Token expired"));

      const session = await verifySession(mockRequest);

      expect(session).toBeNull();
    });

    it("works with different request objects", async () => {
      const mockPayload = {
        userId: "user-789",
        email: "another@example.com",
        expiresAt: new Date(),
      };

      const mockRequest1 = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "token1" }),
        },
      } as unknown as NextRequest;

      const mockRequest2 = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "token2" }),
        },
      } as unknown as NextRequest;

      (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

      await verifySession(mockRequest1);
      await verifySession(mockRequest2);

      expect(mockRequest1.cookies.get).toHaveBeenCalledWith("auth-token");
      expect(mockRequest2.cookies.get).toHaveBeenCalledWith("auth-token");
      expect(jwtVerify).toHaveBeenCalledTimes(2);
    });
  });

  describe("Integration scenarios", () => {
    it("full session lifecycle: create, get, delete", async () => {
      const userId = "user-integration";
      const email = "integration@test.com";

      // Create session
      await createSession(userId, email);
      expect(mockCookieStore.set).toHaveBeenCalled();

      // Get session
      const mockPayload = { userId, email, expiresAt: new Date() };
      mockCookieStore.get.mockReturnValue({ value: "token" });
      (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

      const session = await getSession();
      expect(session).toEqual(mockPayload);

      // Delete session
      await deleteSession();
      expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
    });

    it("handles session creation failure gracefully", async () => {
      mockSignJWT.sign.mockRejectedValue(new Error("Signing failed"));

      await expect(createSession("user-123", "test@example.com")).rejects.toThrow(
        "Signing failed"
      );
    });

    it("verifySession and getSession return consistent results", async () => {
      const mockPayload = {
        userId: "user-consistent",
        email: "consistent@test.com",
        expiresAt: new Date(),
      };

      // Setup for getSession
      mockCookieStore.get.mockReturnValue({ value: "same-token" });
      (jwtVerify as any).mockResolvedValue({ payload: mockPayload });

      const sessionFromGet = await getSession();

      // Setup for verifySession
      const mockRequest = {
        cookies: {
          get: vi.fn().mockReturnValue({ value: "same-token" }),
        },
      } as unknown as NextRequest;

      const sessionFromVerify = await verifySession(mockRequest);

      expect(sessionFromGet).toEqual(sessionFromVerify);
    });
  });

  describe("Edge cases", () => {
    it("handles empty userId and email", async () => {
      await createSession("", "");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "",
          email: "",
        })
      );
    });

    it("handles very long email addresses", async () => {
      const longEmail = "a".repeat(100) + "@example.com";

      await createSession("user-123", longEmail);

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          email: longEmail,
        })
      );
    });

    it("handles special characters in userId", async () => {
      const specialUserId = "user-123!@#$%^&*()";

      await createSession(specialUserId, "test@example.com");

      expect(SignJWT).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: specialUserId,
        })
      );
    });

    it("handles token with no value property", async () => {
      mockCookieStore.get.mockReturnValue({});

      const session = await getSession();

      expect(session).toBeNull();
    });

    it("handles null cookie value", async () => {
      mockCookieStore.get.mockReturnValue({ value: null });

      const session = await getSession();

      expect(session).toBeNull();
    });
  });
});
