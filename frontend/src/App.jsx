import React, { useCallback, useState } from "react";
import {
  buildGoogleCalendarUrl,
  isValidEmail,
  isValidTimezone,
  validateCalendarDraft,
  validateRawEventText,
} from "./calendarUrl.js";
import {
  validateExtractEventError,
  validateExtractEventResponse,
} from "./validation/extraction.js";

const ExtractionState = {
  IDLE: "idle",
  LOADING: "loading",
  GENERATED: "generated",
  ERROR: "error",
};

const DEFAULT_START_TIME = "10:00";
const TEXT_TIME_RE =
  /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b|\b(?:noon|midnight)\b/i;
const RECENT_GUESTS_STORAGE_KEY = "calendar-tool-recent-guests";
const MAX_RECENT_GUESTS = 12;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

function apiPath(path) {
  return `${API_BASE_URL}${path}`;
}

function loadRecentGuests() {
  try {
    const raw = window.localStorage.getItem(RECENT_GUESTS_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((guest) => typeof guest === "string" && isValidEmail(guest))
      .slice(0, MAX_RECENT_GUESTS);
  } catch {
    return [];
  }
}

function saveRecentGuests(guests) {
  try {
    window.localStorage.setItem(
      RECENT_GUESTS_STORAGE_KEY,
      JSON.stringify(guests),
    );
  } catch {
    /* ignore */
  }
}

function getDefaultTimezone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === "string" && isValidTimezone(tz)) return tz;
  } catch {
    /* ignore */
  }
  return "America/Los_Angeles";
}

function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localTime(d = new Date()) {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function nextISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + 1);
  return localISODate(d);
}

function hasTimeSignal(value) {
  return TEXT_TIME_RE.test(value);
}

function hasWarning(warnings, code) {
  return warnings.some((warning) => warning?.code === code);
}

export function avoidPastDefaultStart(
  draft,
  warnings,
  sourceText,
  now = new Date(),
) {
  const today = localISODate(now);
  const nowTime = localTime(now);
  const looksDefaulted =
    draft.startTime === DEFAULT_START_TIME &&
    (draft.missingStartTime ||
      hasWarning(warnings, "DEFAULT_START_TIME") ||
      !hasTimeSignal(sourceText));

  if (
    looksDefaulted &&
    draft.date === today &&
    nowTime >= DEFAULT_START_TIME
  ) {
    return { ...draft, date: nextISODate(draft.date) };
  }
  return draft;
}

/** @param {string} v */
function normalizeStartTime(v) {
  const t = v.trim();
  if (!t) return { startTime: null, missingStartTime: true };
  return { startTime: t, missingStartTime: false };
}

export default function App() {
  const [text, setText] = useState("");
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [status, setStatus] = useState(ExtractionState.IDLE);
  const [draft, setDraft] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [inputError, setInputError] = useState("");
  const [apiError, setApiError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [calendarValidation, setCalendarValidation] = useState(null);
  const [guestInput, setGuestInput] = useState("");
  const [guestError, setGuestError] = useState(false);
  const [recentGuests, setRecentGuests] = useState(loadRecentGuests);
  const [isDraftCardOpen, setIsDraftCardOpen] = useState(false);

  const updateDraft = useCallback((field, value) => {
    setCalendarError("");
    setCalendarValidation(null);
    setDraft((d) => {
      if (!d) return d;
      if (field === "startTime") {
        const { startTime, missingStartTime } = normalizeStartTime(
          typeof value === "string" ? value : "",
        );
        return { ...d, startTime, missingStartTime };
      }
      return { ...d, [field]: value };
    });
  }, []);

  const clearAll = () => {
    setText("");
    setTimezone(getDefaultTimezone());
    setStatus(ExtractionState.IDLE);
    setDraft(null);
    setWarnings([]);
    setInputError("");
    setApiError("");
    setCalendarError("");
    setCalendarValidation(null);
    setGuestInput("");
    setGuestError(false);
    setIsDraftCardOpen(false);
  };

  const addGuest = () => {
    const v = guestInput.trim();
    if (!v) return;
    if (!isValidEmail(v)) {
      setGuestError(true);
      setCalendarError("");
      setCalendarValidation(null);
      return;
    }
    setRecentGuests((previous) => {
      const next = [
        v,
        ...previous.filter((guest) => guest.toLowerCase() !== v.toLowerCase()),
      ].slice(0, MAX_RECENT_GUESTS);
      saveRecentGuests(next);
      return next;
    });
    setDraft((d) => {
      if (!d) return d;
      if (d.guests.includes(v)) {
        setGuestInput("");
        setGuestError(false);
        return d;
      }
      return { ...d, guests: [...d.guests, v] };
    });
    setGuestInput("");
    setGuestError(false);
    setCalendarError("");
    setCalendarValidation(null);
  };

  const removeGuest = (email) => {
    setCalendarError("");
    setCalendarValidation(null);
    setDraft((d) =>
      d ? { ...d, guests: d.guests.filter((g) => g !== email) } : d,
    );
  };

  const openGoogleCalendar = () => {
    if (!draft) return;
    const validation = validateCalendarDraft(draft);
    if (!validation.valid) {
      setCalendarValidation(validation);
      setCalendarError(
        "Fix the highlighted fields before opening Google Calendar.",
      );
      return;
    }

    const url = buildGoogleCalendarUrl(draft);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      setCalendarValidation(null);
      setCalendarError(
        "Your browser blocked the new tab. Allow pop-ups for this site and try again.",
      );
      return;
    }
    setCalendarError("");
    setCalendarValidation(null);
  };

  const generate = async () => {
    const rawValidation = validateRawEventText(text);
    if (!rawValidation.valid) {
      setInputError(rawValidation.message);
    }
    if (!rawValidation.valid) {
      return;
    }
    const trimmed = text.trim();
    setInputError("");
    setApiError("");
    setCalendarError("");
    setCalendarValidation(null);
    setStatus(ExtractionState.LOADING);

    const body = {
      text: trimmed,
      timezone,
      currentDate: localISODate(),
      locale: navigator.language || "en-US",
    };

    try {
      const res = await fetch(apiPath("/api/extract-event"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        try {
          validateExtractEventError(data);
          const msg =
            data?.error?.message ||
            data?.error?.code ||
            "Could not extract event.";
          setApiError(msg);
        } catch {
          setApiError("Unexpected error response from server.");
        }
        setStatus(ExtractionState.ERROR);
        return;
      }

      try {
        validateExtractEventResponse(data);
        const responseWarnings = Array.isArray(data.warnings)
          ? data.warnings
          : [];
        setDraft(avoidPastDefaultStart(data.draft, responseWarnings, trimmed));
        setWarnings(responseWarnings);
        setIsDraftCardOpen(true);
        setStatus(ExtractionState.GENERATED);
      } catch (e) {
        setApiError(
          e instanceof Error ? e.message : "Invalid response from server.",
        );
        setStatus(ExtractionState.ERROR);
      }
    } catch {
      setApiError(
        "Network error. Is the backend running and reachable?",
      );
      setStatus(ExtractionState.ERROR);
    }
  };

  const showDraft = draft && status !== ExtractionState.LOADING;
  const showDraftCard = showDraft && isDraftCardOpen;
  const fieldErrors = calendarValidation?.fieldErrors ?? {};
  const guestSuggestions = recentGuests.filter(
    (guest) => !draft?.guests.includes(guest),
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Text2Calendar</h1>
          <p>Turn event text into a Google Calendar draft</p>
        </div>
      </header>

      <main className="main-panel">
        <section className="col col-input" aria-labelledby="input-heading">
          <div className="col-head">
            <h2 id="input-heading" className="col-title">
              Event text
            </h2>
            <span className="col-meta">
              {text.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            className="textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (inputError) setInputError("");
            }}
            placeholder="Paste an email, message, flyer text, or event description…"
            rows={14}
            disabled={status === ExtractionState.LOADING}
            aria-invalid={Boolean(inputError)}
          />
          {inputError ? (
            <p className="inline-error" role="alert">
              {inputError}
            </p>
          ) : null}

          <div className="actions">
            <button
              type="button"
              className="btn-primary"
              disabled={status === ExtractionState.LOADING}
              onClick={generate}
            >
              Generate event
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={status === ExtractionState.LOADING}
              onClick={clearAll}
            >
              Clear
            </button>
            {draft ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={status === ExtractionState.LOADING}
                onClick={() => setIsDraftCardOpen(true)}
              >
                View draft
              </button>
            ) : null}
          </div>

          {status === ExtractionState.LOADING ? (
            <div className="preview-panel preview-loading">
              <p className="loading-title">Extracting event…</p>
              <ul className="loading-steps">
                <li className="done">Reading your text…</li>
                <li className="active">Calling the extractor…</li>
                <li>Building the draft…</li>
              </ul>
            </div>
          ) : null}

          {status === ExtractionState.ERROR ? (
            <div className="preview-panel preview-error" role="alert">
              <p className="error-title">Something went wrong</p>
              <p className="error-body">{apiError}</p>
              <p className="error-hint">
                Fix the issue if you can, then try{" "}
                <strong>Generate event</strong> again. Your pasted text is
                unchanged.
              </p>
            </div>
          ) : null}
        </section>

        {showDraftCard ? (
          <div
            className="draft-modal"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsDraftCardOpen(false);
            }}
          >
            <section
              className="draft-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="preview-heading"
            >
              <div className="draft-card-head">
                <h2 id="preview-heading" className="col-title">
                  Calendar draft
                </h2>
                <button
                  type="button"
                  className="draft-close"
                  aria-label="Close draft"
                  onClick={() => setIsDraftCardOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="preview-panel preview-draft">
              {draft.missingStartTime ? (
                <p className="banner banner-warn" role="status">
                  Start time is missing — add a start time before opening Google
                  Calendar.
                </p>
              ) : null}

              <div className="fields">
                <div className="field">
                  <label className="field-label" htmlFor="f-title">
                    Title
                  </label>
                  <input
                    id="f-title"
                    className="input"
                    value={draft.title}
                    onChange={(e) => updateDraft("title", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="f-date">
                    Date (YYYY-MM-DD)
                  </label>
                  <input
                    id="f-date"
                    className="input"
                    value={draft.date}
                    onChange={(e) => updateDraft("date", e.target.value)}
                    aria-invalid={Boolean(fieldErrors.date)}
                  />
                  {fieldErrors.date ? (
                    <p className="inline-error tight" role="alert">
                      {fieldErrors.date}
                    </p>
                  ) : null}
                </div>
                <div className="field-row">
                  <div className="field">
                    <label className="field-label" htmlFor="f-start">
                      Start time (HH:mm)
                    </label>
                    <input
                      id="f-start"
                      className="input"
                      value={draft.startTime ?? ""}
                      onChange={(e) => updateDraft("startTime", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.startTime)}
                    />
                    {fieldErrors.startTime ? (
                      <p className="inline-error tight" role="alert">
                        {fieldErrors.startTime}
                      </p>
                    ) : null}
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="f-end">
                      End time (HH:mm or empty)
                    </label>
                    <input
                      id="f-end"
                      className="input"
                      value={draft.endTime ?? ""}
                      aria-invalid={Boolean(fieldErrors.endTime)}
                      onChange={(e) => {
                        const v = e.target.value.trim();
                        updateDraft("endTime", v === "" ? null : v);
                      }}
                    />
                    {fieldErrors.endTime ? (
                      <p className="inline-error tight" role="alert">
                        {fieldErrors.endTime}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="f-loc">
                    Location
                  </label>
                  <input
                    id="f-loc"
                    className="input"
                    value={draft.location}
                    onChange={(e) => updateDraft("location", e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="f-notes">
                    Notes
                  </label>
                  <textarea
                    id="f-notes"
                    className="textarea textarea-compact"
                    rows={6}
                    value={draft.notes}
                    onChange={(e) => updateDraft("notes", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="f-guest">
                    Guests
                  </label>
                  <div
                    className={
                      "guest-row" + (guestError ? " guest-row-error" : "")
                    }
                  >
                    <input
                      id="f-guest"
                      className="input guest-input"
                      list="guest-suggestions"
                      placeholder="name@example.com"
                      value={guestInput}
                      onChange={(e) => {
                        setGuestInput(e.target.value);
                        setGuestError(false);
                        setCalendarError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addGuest();
                        }
                      }}
                    />
                    <datalist id="guest-suggestions">
                      {guestSuggestions.map((guest) => (
                        <option key={guest} value={guest} />
                      ))}
                    </datalist>
                    <button
                      type="button"
                      className="btn-secondary btn-small"
                      onClick={addGuest}
                    >
                      Add
                    </button>
                  </div>
                  {guestError ? (
                    <p className="inline-error tight" role="alert">
                      Enter a valid email address.
                    </p>
                  ) : null}
                  {fieldErrors.guests ? (
                    <p className="inline-error tight" role="alert">
                      {fieldErrors.guests}
                    </p>
                  ) : null}
                  {draft.guests.length > 0 ? (
                    <div className="chips">
                      {draft.guests.map((g) => (
                        <span key={g} className="chip">
                          <span className="chip-text">{g}</span>
                          <button
                            type="button"
                            className="chip-remove"
                            aria-label={`Remove ${g}`}
                            onClick={() => removeGuest(g)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="calendar-action">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={openGoogleCalendar}
                >
                  Add to Google Calendar
                </button>
                {calendarError ? (
                  <p className="inline-error calendar-error" role="alert">
                    {calendarError}
                  </p>
                ) : null}
                {fieldErrors.timezone ? (
                  <p className="inline-error calendar-error" role="alert">
                    {fieldErrors.timezone}
                  </p>
                ) : null}
                <p className="field-hint calendar-note">
                  Opens Google Calendar in a new tab with this event pre-filled.
                  The event is not created until you review and save it there.
                </p>
              </div>

              <div className="draft-footnotes">
                {warnings.length > 0 ? (
                  <ul className="warnings" aria-label="Extraction warnings">
                    {warnings.map((w, i) => (
                      <li key={`${w.code}-${i}`} className="warning-item">
                        <span className="warning-code">{w.code}</span>
                        {w.message}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="helpers">
                  <p className="field-hint">
                    If year or month was missing, the extractor picks the
                    nearest reasonable upcoming date. If duration was missing,
                    it defaults to one hour. Edit anything before adding to
                    Google Calendar.
                  </p>
                </div>
              </div>
            </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
