/* global React, ReactDOM, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakSelect, TweakColor, TweakToggle */
const { useState, useEffect, useRef, useMemo } = React;

// ---- Tokens / Tweaks defaults -------------------------------------------------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "demoState": "generated",
  "accent": "#3a4ec9",
  "density": "comfortable",
  "showHelpers": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ["#3a4ec9", "#1f6f5c", "#b1502a", "#1a1a1a"];

// ---- Sample data -------------------------------------------------------------
const SAMPLE_INPUT = `5/6 : Wednesday May 6th will be our "Restaurant Night" Fundraiser at the Foster City Food Trucks at Leo J. Ryan Park. If you choose to participate, bring your child to the event at 5:15 to check in with Mrs. Lazar (finding parking is difficult, so plan ahead). Performances will be between 5:30 and 6:00pm. Please send your child in the their Beach Park T-Shirt.`;

const GENERATED = {
  title: "Nora Performance @ Food Truck Night",
  date: "2026-05-06",
  start: "17:15",
  end: "18:00",
  tz: "America/Los_Angeles",
  location: "Foster City Food Trucks at Leo J. Ryan Park",
  notes: [
    "5:15 check-in with Mrs. Lazar",
    "5:30–6:00 performance",
    "Wear Beach Park T-Shirt",
    "Parking is difficult, plan ahead",
  ].join("\n"),
  guests: ["alex@example.com"],
};

const EMPTY_DRAFT = {
  title: "", date: "", start: "", end: "",
  tz: "America/Los_Angeles", location: "", notes: "", guests: [],
};

// ---- Helpers -----------------------------------------------------------------
const fmtDateLong = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
};

const fmtTime12 = (hhmm) => {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
};

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// ---- Iconography (tiny inline glyphs only) -----------------------------------
const I = ({ d, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICON = {
  cal: "M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3-3v4m8-4v4",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  pin: "M12 21s-7-7.5-7-12a7 7 0 1 1 14 0c0 4.5-7 12-7 12zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  globe: "M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  user: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  x: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 5l7 7-7 7",
  warn: "M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  spark: "M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1",
  plus: "M12 5v14M5 12h14",
  refresh: "M21 12a9 9 0 1 1-3.5-7.1M21 4v5h-5",
};

// ---- Header ------------------------------------------------------------------
function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logomark" aria-hidden="true">
          <svg viewBox="0 0 28 28" width="22" height="22">
            <rect x="2.5" y="5" width="23" height="20" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M2.5 11h23" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M9 3.5v4M19 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M8.5 17.5l3 3 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <div className="brand-text">
          <h1>Text to Calendar</h1>
          <p>Turn event text into a Google Calendar draft</p>
        </div>
      </div>

    </header>
  );
}

// ---- Input column ------------------------------------------------------------
function InputColumn({ raw, setRaw, tz, setTz, onGenerate, onClear, demoState, showHelpers }) {
  const ta = useRef(null);
  const charCount = raw.length;
  const showEmptyError = demoState === "empty";

  return (
    <section className="col col-input" aria-labelledby="input-h">
      <div className="col-head">
        <h2 id="input-h" className="col-title">Event text</h2>
        <span className="col-meta">{charCount.toLocaleString()} chars</span>
      </div>

      <div className={"textarea-wrap" + (showEmptyError ? " is-error" : "")}>
        <textarea
          ref={ta}
          className="textarea"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste an email, message, flyer text, or event description…"
          spellCheck={false}
        />
        {raw.length === 0 && !showEmptyError && (
          <button type="button" className="ta-ghost" onClick={() => setRaw(SAMPLE_INPUT)}>
            <I d={ICON.spark} size={13} />
            <span>Try with sample</span>
          </button>
        )}
      </div>

      {showEmptyError && (
        <div className="inline-error" role="alert">
          <I d={ICON.warn} size={14} />
          <span>Paste some event text first — we need something to extract.</span>
        </div>
      )}

      <div className="context-row">
        <label className="field-label" htmlFor="tz-input">
          <I d={ICON.globe} size={13} />
          <span>Timezone</span>
        </label>
        <select id="tz-input" className="select tz-select" value={tz} onChange={(e) => setTz(e.target.value)}>
          <option>America/Los_Angeles</option>
          <option>America/Denver</option>
          <option>America/Chicago</option>
          <option>America/New_York</option>
          <option>Europe/London</option>
          <option>Europe/Berlin</option>
          <option>Asia/Tokyo</option>
        </select>
      </div>

      <div className="actions-row">
        <button type="button" className="btn btn-ghost" onClick={onClear}>Clear</button>
        <button type="button" className="btn btn-dark" onClick={onGenerate} disabled={demoState === "loading"}>
          {demoState === "loading" ? (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>Reading text…</span>
            </>
          ) : (
            <>
              <span>Generate event</span>
              <I d={ICON.arrow} size={14} />
            </>
          )}
        </button>
      </div>


    </section>
  );
}

// ---- Preview column ----------------------------------------------------------
function PreviewColumn({ draft, setDraft, demoState, showHelpers }) {
  const empty = demoState === "empty" || !draft.title;
  const loading = demoState === "loading";
  const missingStart = demoState === "missingStart";
  const badEmail = demoState === "badEmail";

  if (empty) return <EmptyPreview />;
  if (loading) return <LoadingPreview />;

  return (
    <section className="col col-preview" aria-labelledby="prev-h">
      <div className="col-head">
        <h2 id="prev-h" className="col-title">Calendar draft</h2>
        <button type="button" className="link-btn" title="Re-run extraction">
          <I d={ICON.refresh} size={12} /> Regenerate
        </button>
      </div>

      <DraftCard
        draft={draft}
        setDraft={setDraft}
        missingStart={missingStart}
        badEmail={badEmail}
        showHelpers={showHelpers}
      />
    </section>
  );
}

function EmptyPreview() {
  return (
    <section className="col col-preview is-empty" aria-labelledby="prev-h">
      <div className="col-head">
        <h2 id="prev-h" className="col-title">Calendar draft</h2>
      </div>
      <div className="empty-state">
        <div className="empty-mark" aria-hidden="true">
          <svg viewBox="0 0 56 56" width="44" height="44">
            <rect x="6" y="11" width="44" height="38" rx="5" fill="none" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M6 22h44" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M17 6v9M39 6v9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M16 32h12M16 38h20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3"/>
          </svg>
        </div>
        <p className="empty-title">No draft yet</p>
        <p className="empty-sub">Paste event text and run <kbd>Generate event</kbd>. Your draft will appear here, ready to edit.</p>
      </div>
    </section>
  );
}

function LoadingPreview() {
  return (
    <section className="col col-preview is-loading" aria-labelledby="prev-h">
      <div className="col-head">
        <h2 id="prev-h" className="col-title">Calendar draft</h2>
        <span className="col-meta loading-meta">
          <span className="spinner" aria-hidden="true" /> Extracting…
        </span>
      </div>
      <div className="skeleton-card">
        <div className="sk sk-title" />
        <div className="sk-row"><div className="sk sk-chip" /><div className="sk sk-chip" /></div>
        <div className="sk sk-line" />
        <div className="sk sk-line short" />
        <div className="sk sk-block" />
      </div>
      <ul className="extract-stream">
        <li className="done">Parsing dates and times…</li>
        <li className="done">Identifying location…</li>
        <li className="active">Drafting title and notes…</li>
        <li>Checking for guests…</li>
      </ul>
    </section>
  );
}

// ---- Draft card --------------------------------------------------------------
function DraftCard({ draft, setDraft, missingStart, badEmail, showHelpers }) {
  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const [guestInput, setGuestInput] = useState(badEmail ? "alex@@example" : "");
  const [guestErr, setGuestErr] = useState(badEmail);

  const addGuest = () => {
    const v = guestInput.trim();
    if (!v) return;
    if (!isEmail(v)) { setGuestErr(true); return; }
    if (draft.guests.includes(v)) { setGuestInput(""); return; }
    update("guests", [...draft.guests, v]);
    setGuestInput("");
    setGuestErr(false);
  };
  const removeGuest = (g) => update("guests", draft.guests.filter((x) => x !== g));

  const startDisplay = draft.start ? fmtTime12(draft.start) : "";
  const endDisplay = draft.end ? fmtTime12(draft.end) : "";
  const canSubmit = !!draft.start && !!draft.title;

  return (
    <article className="draft">
      {/* Title */}
      <div className="field field-title">
        <label className="sr-only" htmlFor="f-title">Title</label>
        <input
          id="f-title"
          className="title-input"
          value={draft.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Event title"
        />
      </div>

      {/* When row */}
      <div className="field-row when-row">
        <div className="field field-date">
          <label className="field-label" htmlFor="f-date"><I d={ICON.cal} /><span>Date</span></label>
          <input id="f-date" type="date" className="input"
                 value={draft.date} onChange={(e) => update("date", e.target.value)} />
        </div>

        <div className={"field field-time" + (missingStart ? " is-error" : "")}>
          <label className="field-label" htmlFor="f-start"><I d={ICON.clock} /><span>Start</span></label>
          <input id="f-start" type="time" className="input"
                 value={missingStart ? "" : draft.start}
                 onChange={(e) => update("start", e.target.value)}
                 placeholder="—:—" />
        </div>

        <div className="field field-time">
          <label className="field-label" htmlFor="f-end"><I d={ICON.clock} /><span>End</span></label>
          <input id="f-end" type="time" className="input"
                 value={draft.end} onChange={(e) => update("end", e.target.value)} />
        </div>
      </div>

      {missingStart && (
        <div className="inline-error">
          <I d={ICON.warn} size={14} />
          <span>Start time is required to create a useful calendar event.</span>
        </div>
      )}

      {/* Timezone */}
      <div className="field">
        <label className="field-label" htmlFor="f-tz"><I d={ICON.globe} /><span>Timezone</span></label>
        <select id="f-tz" className="select" value={draft.tz} onChange={(e) => update("tz", e.target.value)}>
          <option>America/Los_Angeles</option>
          <option>America/Denver</option>
          <option>America/Chicago</option>
          <option>America/New_York</option>
          <option>Europe/London</option>
          <option>Europe/Berlin</option>
          <option>Asia/Tokyo</option>
        </select>
      </div>

      {/* Location */}
      <div className="field">
        <label className="field-label" htmlFor="f-loc"><I d={ICON.pin} /><span>Location</span></label>
        <input id="f-loc" className="input" value={draft.location}
               onChange={(e) => update("location", e.target.value)}
               placeholder="Add a place or address" />
      </div>

      {/* Notes */}
      <div className="field">
        <label className="field-label notes-label" htmlFor="f-notes">
          <span>Notes</span>
          <span className="field-label-hint">One bullet per line</span>
        </label>
        <NotesEditor value={draft.notes} onChange={(v) => update("notes", v)} />
      </div>

      {/* Guests */}
      <div className="field">
        <label className="field-label" htmlFor="f-guest"><I d={ICON.user} /><span>Guests</span></label>
        <div className={"guest-row" + (guestErr ? " is-error" : "")}>
          <input
            id="f-guest"
            className="input guest-input"
            placeholder="name@example.com"
            value={guestInput}
            onChange={(e) => { setGuestInput(e.target.value); setGuestErr(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGuest(); } }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={addGuest}>
            <I d={ICON.plus} size={12} /> Add
          </button>
        </div>
        {guestErr && (
          <div className="inline-error tight">
            <I d={ICON.warn} size={12} />
            <span>That doesn't look like a valid email address.</span>
          </div>
        )}
        {draft.guests.length > 0 && (
          <div className="chips">
            {draft.guests.map((g) => (
              <span key={g} className="chip">
                <span className="chip-avatar" aria-hidden="true">{g[0].toUpperCase()}</span>
                <span>{g}</span>
                <button type="button" className="chip-x" onClick={() => removeGuest(g)} aria-label={`Remove ${g}`}>
                  <I d={ICON.x} size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Submit row */}
      <div className="submit-row">
        <button type="button" className="btn btn-primary" disabled={!canSubmit}
                title={!canSubmit ? "Fill the start time first" : "Open Google Calendar with this event pre-filled"}>
          <span>Add to Google Calendar</span>
          <I d={ICON.arrow} size={14} />
        </button>
        <p className="submit-note">
          Opens Google Calendar with this event pre-filled. You'll review and save it there — nothing is created until you do.
        </p>
      </div>
    </article>
  );
}

// ---- Notes editor (textarea + bullet preview) --------------------------------
function NotesEditor({ value, onChange }) {
  const lines = value.split("\n").filter((l) => l.trim().length > 0);
  return (
    <div className="notes-editor">
      <textarea
        id="f-notes"
        className="textarea notes-ta"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(3, lines.length + 1)}
        placeholder="Anything practical worth keeping — instructions, timing, reminders…"
      />
      {lines.length > 0 && (
        <ul className="notes-preview" aria-hidden="true">
          {lines.map((l, i) => <li key={i}><span className="bullet">—</span><span>{l}</span></li>)}
        </ul>
      )}
    </div>
  );
}

// ---- Tweaks panel ------------------------------------------------------------
function TweaksUI({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Demo state">
        <TweakSelect
          label="State"
          value={tweaks.demoState}
          onChange={(v) => setTweak("demoState", v)}
          options={[
            { value: "generated", label: "Generated draft" },
            { value: "empty", label: "Empty input" },
            { value: "loading", label: "Loading" },
            { value: "missingStart", label: "Missing start time" },
            { value: "badEmail", label: "Invalid guest email" },
          ]}
        />
      </TweakSection>

      <TweakSection label="Style">
        <TweakColor
          label="Accent"
          value={tweaks.accent}
          onChange={(v) => setTweak("accent", v)}
          options={ACCENT_OPTIONS}
        />
        <TweakRadio
          label="Density"
          value={tweaks.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact", label: "Compact" },
          ]}
        />
        <TweakToggle
          label="Show helper hints"
          value={tweaks.showHelpers}
          onChange={(v) => setTweak("showHelpers", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

// ---- App ---------------------------------------------------------------------
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [raw, setRaw] = useState(SAMPLE_INPUT);
  const [tz, setTz] = useState("America/Los_Angeles");
  const [draft, setDraft] = useState(GENERATED);

  // Mirror demoState into draft / inputs so the demo reads correctly
  useEffect(() => {
    if (tweaks.demoState === "empty") {
      setRaw("");
      setDraft(EMPTY_DRAFT);
    } else if (tweaks.demoState === "loading") {
      setRaw(SAMPLE_INPUT);
      setDraft(EMPTY_DRAFT);
    } else if (tweaks.demoState === "missingStart") {
      setRaw(SAMPLE_INPUT);
      setDraft({ ...GENERATED, start: "" });
    } else {
      setRaw(SAMPLE_INPUT);
      setDraft(GENERATED);
    }
  }, [tweaks.demoState]);

  // Live theme via CSS vars
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.accent, tweaks.density]);

  const onGenerate = () => {
    if (!raw.trim()) { setTweak("demoState", "empty"); return; }
    setTweak("demoState", "loading");
    setTimeout(() => {
      setTweak("demoState", "generated");
    }, 1400);
  };
  const onClear = () => { setRaw(""); setTweak("demoState", "empty"); };

  return (
    <div className="app" data-screen-label="01 Home">
      <Header />
      <main className="grid">
        <InputColumn
          raw={raw} setRaw={setRaw}
          tz={tz} setTz={setTz}
          onGenerate={onGenerate} onClear={onClear}
          demoState={tweaks.demoState}
          showHelpers={tweaks.showHelpers}
        />
        <PreviewColumn
          draft={draft}
          setDraft={setDraft}
          demoState={tweaks.demoState}
          showHelpers={tweaks.showHelpers}
        />
      </main>
      <footer className="foot">
        <span>Demo · no events are created until you save in Google Calendar</span>
      </footer>
      <TweaksUI tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
