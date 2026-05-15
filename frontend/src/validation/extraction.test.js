import { describe, expect, it } from "vitest";
import {
  validateEventDraft,
  validateExtractionWarning,
  validateExtractEventError,
  validateExtractEventRequest,
  validateExtractEventResponse,
} from "./extraction.js";

function validDraft(overrides = {}) {
  return {
    title: "T",
    date: "2026-05-12",
    startTime: "10:00",
    endTime: "11:00",
    timezone: "America/Los_Angeles",
    location: "",
    notes: "",
    guests: [],
    missingStartTime: false,
    ...overrides,
  };
}

describe("validateExtractEventRequest", () => {
  it("accepts a minimal valid request", () => {
    expect(() =>
      validateExtractEventRequest({
        text: "hello",
        timezone: "UTC",
        currentDate: "2026-05-12",
      }),
    ).not.toThrow();
  });

  it("accepts currentTime on requests", () => {
    expect(() =>
      validateExtractEventRequest({
        text: "hello",
        timezone: "UTC",
        currentDate: "2026-05-12",
        currentTime: "23:20",
      }),
    ).not.toThrow();
  });

  it("rejects invalid currentTime", () => {
    expect(() =>
      validateExtractEventRequest({
        text: "hello",
        timezone: "UTC",
        currentDate: "2026-05-12",
        currentTime: "24:00",
      }),
    ).toThrow();
  });

  it("rejects empty text", () => {
    expect(() =>
      validateExtractEventRequest({
        text: "",
        timezone: "UTC",
        currentDate: "2026-05-12",
      }),
    ).toThrow();
  });

  it("rejects invalid currentDate", () => {
    expect(() =>
      validateExtractEventRequest({
        text: "a",
        timezone: "UTC",
        currentDate: "5/12/2026",
      }),
    ).toThrow();
  });
});

describe("validateEventDraft", () => {
  it("accepts a valid draft", () => {
    expect(() => validateEventDraft(validDraft())).not.toThrow();
  });

  it("accepts null startTime when missingStartTime is true", () => {
    expect(() =>
      validateEventDraft(
        validDraft({
          startTime: null,
          endTime: null,
          missingStartTime: true,
        }),
      ),
    ).not.toThrow();
  });

  it("rejects inconsistent missingStartTime", () => {
    expect(() =>
      validateEventDraft(
        validDraft({
          startTime: null,
          missingStartTime: false,
        }),
      ),
    ).toThrow(/missingStartTime/);
  });

  it("rejects invalid time format", () => {
    expect(() => validateEventDraft(validDraft({ startTime: "25:99" }))).toThrow();
  });

  it("rejects extra properties (no raw text on draft)", () => {
    const d = validDraft();
    d.rawPastedText = "x";
    expect(() => validateEventDraft(d)).toThrow();
  });
});

describe("validateExtractionWarning", () => {
  it("accepts a known warning code", () => {
    expect(() =>
      validateExtractionWarning({
        field: "general",
        code: "LOW_CONFIDENCE",
        message: "Uncertain.",
      }),
    ).not.toThrow();
  });

  it("accepts the default start time warning code", () => {
    expect(() =>
      validateExtractionWarning({
        field: "startTime",
        code: "DEFAULT_START_TIME",
        message: "No clear start time found; defaulted to 10:00 AM.",
      }),
    ).not.toThrow();
  });

  it("rejects unknown warning code", () => {
    expect(() =>
      validateExtractionWarning({
        field: "date",
        code: "NOT_A_CODE",
        message: "m",
      }),
    ).toThrow();
  });
});

describe("validateExtractEventResponse", () => {
  it("validates nested draft semantics", () => {
    expect(() =>
      validateExtractEventResponse({
        draft: validDraft({ startTime: null, missingStartTime: false }),
        warnings: [],
      }),
    ).toThrow(/missingStartTime/);
  });
});

describe("validateExtractEventError", () => {
  it("accepts INVALID_REQUEST", () => {
    expect(() =>
      validateExtractEventError({
        error: { code: "INVALID_REQUEST", message: "Bad body." },
      }),
    ).not.toThrow();
  });

  it("rejects unknown error code", () => {
    expect(() =>
      validateExtractEventError({
        error: { code: "NOPE", message: "x" },
      }),
    ).toThrow();
  });
});
