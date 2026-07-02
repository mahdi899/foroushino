import { describe, expect, it } from "vitest";
import { validateLead } from "@/lib/services/leads";
import { isValidEmail } from "@/lib/services/newsletter";

describe("validateLead", () => {
  it("passes a complete, valid lead", () => {
    const errors = validateLead({
      name: "سارا رستمی",
      phone: "09121234567",
      email: "sara@example.com",
    });
    expect(errors).toEqual({});
  });

  it("flags a short name", () => {
    const errors = validateLead({ name: "a", phone: "09121234567", email: "a@b.co" });
    expect(errors.name).toBeTruthy();
  });

  it("flags an invalid phone", () => {
    const errors = validateLead({ name: "نام کامل", phone: "abc", email: "a@b.co" });
    expect(errors.phone).toBeTruthy();
  });

  it("flags an invalid email", () => {
    const errors = validateLead({ name: "نام کامل", phone: "09121234567", email: "nope" });
    expect(errors.email).toBeTruthy();
  });

  it("flags overly long notes", () => {
    const errors = validateLead({
      name: "نام کامل",
      phone: "09121234567",
      email: "a@b.co",
      notes: "x".repeat(4001),
    });
    expect(errors.notes).toBeTruthy();
  });
});

describe("isValidEmail", () => {
  it.each(["a@b.co", "user.name@domain.io", "  spaced@mail.com  "])(
    "accepts %s",
    (email) => {
      expect(isValidEmail(email)).toBe(true);
    },
  );

  it.each(["", "no-at", "a@b", "a@@b.co", "a b@c.co"])(
    "rejects %s",
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});
