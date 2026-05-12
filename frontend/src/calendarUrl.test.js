import { describe, expect, it } from "vitest";
import {
  buildGoogleCalendarUrl,
  isValidTimezone,
  validateCalendarDraft,
  validateRawEventText,
} from "./calendarUrl.js";

function validDraft(overrides = {}) {
  return {
    title: "Board Game Night",
    date: "2026-05-12",
    startTime: "18:30",
    endTime: "20:00",
    timezone: "America/Los_Angeles",
    location: "123 Main St",
    notes: "Bring snacks.",
    guests: ["ada@example.com", "grace@example.com"],
    missingStartTime: false,
    ...overrides,
  };
}

function urlParams(url) {
  return new URL(url).searchParams;
}

describe("buildGoogleCalendarUrl", () => {
  it("maps draft fields into Google Calendar query parameters", () => {
    const params = urlParams(buildGoogleCalendarUrl(validDraft()));

    expect(params.get("action")).toBe("TEMPLATE");
    expect(params.get("text")).toBe("Board Game Night");
    expect(params.get("dates")).toBe("20260512T183000/20260512T200000");
    expect(params.get("ctz")).toBe("America/Los_Angeles");
    expect(params.get("location")).toBe("123 Main St");
    expect(params.get("details")).toContain("Bring snacks.");
    expect(params.get("details")).toContain(
      "Guests: ada@example.com, grace@example.com",
    );
    expect(params.getAll("add")).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
  });

  it("defaults an empty end time to one hour after start", () => {
    const params = urlParams(
      buildGoogleCalendarUrl(validDraft({ startTime: "23:30", endTime: null })),
    );

    expect(params.get("dates")).toBe("20260512T233000/20260513T003000");
  });

  it("throws for an invalid draft", () => {
    expect(() =>
      buildGoogleCalendarUrl(
        validDraft({ startTime: null, missingStartTime: true }),
      ),
    ).toThrow(/start time/i);
  });
});

describe("validateCalendarDraft", () => {
  it("blocks missing date", () => {
    expect(validateCalendarDraft(validDraft({ date: "" }))).toMatchObject({
      valid: false,
      fieldErrors: {
        date: "Add a valid date before opening Google Calendar.",
      },
    });
  });

  it("blocks missing start time", () => {
    expect(
      validateCalendarDraft(
        validDraft({ startTime: null, missingStartTime: true }),
      ).errors,
    ).toContain("Add a start time before opening Google Calendar.");
  });

  it("blocks invalid guest emails", () => {
    expect(
      validateCalendarDraft(validDraft({ guests: ["not-an-email"] }))
        .fieldErrors,
    ).toMatchObject({
      guests: "Remove or fix invalid guest email addresses before opening.",
    });
  });

  it("blocks end time that is not after start time", () => {
    expect(
      validateCalendarDraft(
        validDraft({ startTime: "18:30", endTime: "18:30" }),
      ).fieldErrors,
    ).toMatchObject({
      endTime: "End time must be after start time.",
    });
  });

  it("accepts an empty end time", () => {
    expect(validateCalendarDraft(validDraft({ endTime: null }))).toMatchObject({
      valid: true,
    });
  });

  it("blocks invalid timezone values", () => {
    expect(
      validateCalendarDraft(validDraft({ timezone: "Mars/Olympus_Mons" }))
        .fieldErrors,
    ).toMatchObject({
      timezone: "Use a valid IANA timezone, such as America/Los_Angeles.",
    });
  });
});

describe("validateRawEventText", () => {
  it("rejects blank or whitespace-only text", () => {
    expect(validateRawEventText("   ")).toEqual({
      valid: false,
      message: "Paste event text before generating.",
    });
  });

  it("accepts non-empty text after trimming", () => {
    expect(validateRawEventText("  Dinner tomorrow  ")).toEqual({
      valid: true,
      message: "",
    });
  });
});

describe("isValidTimezone", () => {
  it("accepts UTC and IANA timezone names", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("America/Los_Angeles")).toBe(true);
  });

  it("rejects empty and unknown timezone names", () => {
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("Not/A_Timezone")).toBe(false);
  });
});
