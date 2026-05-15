// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { avoidPastDefaultStart } from "./App.jsx";

function draft(overrides = {}) {
  return {
    title: "Restaurant Night Fundraiser",
    date: "2026-05-06",
    startTime: "17:15",
    endTime: "18:00",
    timezone: "America/Los_Angeles",
    location: "Foster City Food Trucks at Leo J. Ryan Park",
    notes: "5:15 check-in with Mrs. Lazar\nParking is difficult, plan ahead",
    guests: [],
    missingStartTime: false,
    ...overrides,
  };
}

function mockExtraction(responseDraft = draft(), warnings = []) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({
      draft: responseDraft,
      warnings,
    }),
  });
}

function mockBrowserTimezone(detectedTimezone) {
  vi.spyOn(Intl, "DateTimeFormat").mockImplementation((_locale, options) => {
    const timeZone = options?.timeZone;
    if (timeZone === "Mars/Olympus_Mons") {
      throw new RangeError("Invalid time zone");
    }
    return {
      resolvedOptions: () => ({
        timeZone: timeZone || detectedTimezone,
      }),
    };
  });
}

async function generateDraft(
  user,
  text = "Restaurant night at 5:15",
  expectedTitle = "Restaurant Night Fundraiser",
) {
  await user.type(
    screen.getByPlaceholderText(
      "Paste an email, message, flyer text, or event description…",
    ),
    text,
  );
  await user.click(screen.getByRole("button", { name: "Generate event" }));
  await screen.findByDisplayValue(expectedTitle);
}

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal(
    "open",
    vi.fn(() => ({})),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App MVP flow", () => {
  it("hides timezone controls and sends the detected timezone", async () => {
    mockBrowserTimezone("Asia/Tokyo");
    mockExtraction();
    const user = userEvent.setup();

    render(<App />);

    expect(screen.queryByLabelText("Timezone")).toBeNull();
    await generateDraft(user);

    const request = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(request.timezone).toBe("Asia/Tokyo");
  });

  it("falls back when browser timezone detection returns an invalid value", async () => {
    mockBrowserTimezone("Mars/Olympus_Mons");
    mockExtraction();
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user);

    const request = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(request.timezone).toBe("America/Los_Angeles");
  });

  it("falls back when browser timezone detection is missing", async () => {
    mockBrowserTimezone(undefined);
    mockExtraction();
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user);

    const request = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(request.timezone).toBe("America/Los_Angeles");
  });

  it("pastes, generates, edits, adds a guest, and opens a calendar URL", async () => {
    mockExtraction();
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user);

    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Updated Food Truck Night");
    await user.type(screen.getByLabelText("Guests"), "alex@example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(
      screen.getByRole("button", { name: "Add to Google Calendar" }),
    );

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][0]).toBe("/api/extract-event");
    const request = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(request.text).toBe("Restaurant night at 5:15");
    expect(request).not.toHaveProperty("currentTime");
    expect(globalThis.open).toHaveBeenCalledTimes(1);

    const openedUrl = globalThis.open.mock.calls[0][0];
    const params = new URL(openedUrl).searchParams;
    expect(params.get("text")).toBe("Updated Food Truck Night");
    expect(params.get("dates")).toBe("20260506T171500/20260506T180000");
    expect(params.get("location")).toBe(
      "Foster City Food Trucks at Leo J. Ryan Park",
    );
    expect(params.getAll("add")).toEqual(["alex@example.com"]);
  });

  it("shows empty input validation without calling the API", async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Generate event" }));

    expect(
      screen.getByText("Paste event text before generating."),
    ).toBeTruthy();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects invalid guest email entry", async () => {
    mockExtraction();
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user);
    await user.type(screen.getByLabelText("Guests"), "alex@@example");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(globalThis.open).not.toHaveBeenCalled();
  });

  it("offers recently added guests as input suggestions", async () => {
    window.localStorage.setItem(
      "calendar-tool-recent-guests",
      JSON.stringify(["alex@example.com"]),
    );
    mockExtraction();
    const user = userEvent.setup();

    const { container } = render(<App />);
    await generateDraft(user);

    expect(
      container.querySelector(
        'datalist#guest-suggestions option[value="alex@example.com"]',
      ),
    ).toBeTruthy();
    await user.type(screen.getByLabelText("Guests"), "alex@example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(
      screen.getByRole("button", { name: "Add to Google Calendar" }),
    );

    const openedUrl = globalThis.open.mock.calls[0][0];
    expect(new URL(openedUrl).searchParams.getAll("add")).toEqual([
      "alex@example.com",
    ]);
  });

  it("blocks opening Google Calendar when start time is missing", async () => {
    mockExtraction(
      draft({
        startTime: null,
        endTime: null,
        missingStartTime: true,
      }),
      [
        {
          field: "startTime",
          code: "MISSING_START_TIME",
          message: "No start time in source text.",
        },
      ],
    );
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user);
    await user.click(
      screen.getByRole("button", { name: "Add to Google Calendar" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Fix the highlighted fields before opening Google Calendar.",
        ),
      ).toBeTruthy();
    });
    expect(
      screen.getByText("Add a start time before opening Google Calendar."),
    ).toBeTruthy();
    expect(globalThis.open).not.toHaveBeenCalled();
  });

  it("opens Google Calendar when the API returns the default 10 AM start time", async () => {
    mockExtraction(
      draft({
        startTime: "10:00",
        endTime: "11:00",
        missingStartTime: false,
      }),
      [
        {
          field: "startTime",
          code: "DEFAULT_START_TIME",
          message: "No clear start time found; defaulted to 10:00 AM.",
        },
      ],
    );
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user, "School fundraiser tomorrow");
    await user.click(
      screen.getByRole("button", { name: "Add to Google Calendar" }),
    );

    expect(globalThis.open).toHaveBeenCalledTimes(1);
    const openedUrl = globalThis.open.mock.calls[0][0];
    expect(new URL(openedUrl).searchParams.get("dates")).toBe(
      "20260506T100000/20260506T110000",
    );
  });

  it("moves a past default 10 AM draft to tomorrow in the browser", () => {
    const adjusted = avoidPastDefaultStart(
      draft({
        title: "爬阁楼",
        date: "2026-05-14",
        startTime: "10:00",
        endTime: "11:00",
        missingStartTime: false,
      }),
      [
        {
          field: "startTime",
          code: "DEFAULT_START_TIME",
          message: "No clear start time found; defaulted to 10:00 AM.",
        },
      ],
      "爬阁楼",
      new Date(2026, 4, 14, 23, 20),
    );

    expect(adjusted.date).toBe("2026-05-15");
  });

  it("uses the draft timezone when opening Google Calendar", async () => {
    mockExtraction(draft({ timezone: "Asia/Tokyo" }));
    const user = userEvent.setup();

    render(<App />);
    await generateDraft(user);
    await user.click(
      screen.getByRole("button", { name: "Add to Google Calendar" }),
    );

    const openedUrl = globalThis.open.mock.calls[0][0];
    expect(new URL(openedUrl).searchParams.get("ctz")).toBe("Asia/Tokyo");
  });
});
