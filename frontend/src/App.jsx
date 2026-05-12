import { useState } from "react";

export default function App() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Text to Calendar</h1>
          <p>Turn event text into a Google Calendar draft</p>
        </div>
      </header>

      <main className="grid">
        <section className="col col-input">
          <div className="col-head">
            <h2 className="col-title">Event text</h2>
            <span className="col-meta">{text.length.toLocaleString()} chars</span>
          </div>
          <textarea
            className="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste event text here..."
            rows={14}
          />
          <div className="actions">
            <button
              type="button"
              className="btn-primary"
              disabled={status === "loading"}
              onClick={() => setStatus("loading")}
            >
              Generate event
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setText("");
                setStatus("idle");
              }}
            >
              Clear
            </button>
          </div>
        </section>

        <section className="col col-preview">
          <div className="col-head">
            <h2 className="col-title">Event preview</h2>
          </div>
          <div className="placeholder">
            Generated event details will appear here.
          </div>
        </section>
      </main>
    </div>
  );
}
