const GOOGLE_CALENDAR_CREATE_URL =
  "https://calendar.google.com/calendar/render";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function validateRawEventText(value) {
  const valid = typeof value === "string" && value.trim().length > 0;
  return {
    valid,
    message: valid ? "" : "Paste event text before generating.",
  };
}

export function isValidEmail(value) {
  return EMAIL_RE.test(value);
}

export function isValidTimezone(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value.trim() });
    return true;
  } catch {
    return false;
  }
}

function parseDate(value) {
  if (!DATE_RE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function parseTime(value) {
  const match = TIME_RE.exec(value);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function dateTimeToMinutes(dateParts, timeParts) {
  const ms = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
  );
  return ms / 60000;
}

function formatCalendarDateTime(dateParts, timeParts) {
  const year = String(dateParts.year).padStart(4, "0");
  const month = String(dateParts.month).padStart(2, "0");
  const day = String(dateParts.day).padStart(2, "0");
  const hour = String(timeParts.hour).padStart(2, "0");
  const minute = String(timeParts.minute).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}00`;
}

function dateTimeFromMinutes(minutes) {
  const date = new Date(minutes * 60000);
  return {
    dateParts: {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    },
    timeParts: {
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    },
  };
}

export function validateCalendarDraft(draft) {
  const errors = [];
  const fieldErrors = {};
  const dateParts = parseDate(draft?.date ?? "");
  const startTimeValue = draft?.startTime ?? "";
  const startTime = parseTime(startTimeValue);
  const endTimeValue = draft?.endTime ?? "";
  const endTime = endTimeValue ? parseTime(endTimeValue) : null;
  const timezoneValue = draft?.timezone ?? "";
  const guests = Array.isArray(draft?.guests) ? draft.guests : [];

  if (!dateParts) {
    fieldErrors.date = "Add a valid date before opening Google Calendar.";
    errors.push(fieldErrors.date);
  }

  if (draft?.missingStartTime || !startTimeValue) {
    fieldErrors.startTime = "Add a start time before opening Google Calendar.";
    errors.push(fieldErrors.startTime);
  } else if (!startTime) {
    fieldErrors.startTime = "Use a valid start time in HH:mm format.";
    errors.push(fieldErrors.startTime);
  }

  if (endTimeValue && !endTime) {
    fieldErrors.endTime =
      "Use a valid end time in HH:mm format, or leave it empty.";
    errors.push(fieldErrors.endTime);
  }

  if (dateParts && startTime && endTime) {
    const startMinutes = dateTimeToMinutes(dateParts, startTime);
    const endMinutes = dateTimeToMinutes(dateParts, endTime);
    if (endMinutes <= startMinutes) {
      fieldErrors.endTime = "End time must be after start time.";
      errors.push(fieldErrors.endTime);
    }
  }

  if (!isValidTimezone(timezoneValue)) {
    fieldErrors.timezone =
      "Use a valid IANA timezone, such as America/Los_Angeles.";
    errors.push(fieldErrors.timezone);
  }

  if (guests.some((guest) => !isValidEmail(guest))) {
    fieldErrors.guests =
      "Remove or fix invalid guest email addresses before opening.";
    errors.push(fieldErrors.guests);
  }

  return {
    valid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

function buildDetails(notes, guests) {
  const trimmedNotes = (notes ?? "").trim();
  if (!guests.length) return trimmedNotes;
  const guestLine = `Guests: ${guests.join(", ")}`;
  return trimmedNotes ? `${trimmedNotes}\n\n${guestLine}` : guestLine;
}

export function buildGoogleCalendarUrl(draft) {
  const validation = validateCalendarDraft(draft);
  if (!validation.valid) {
    throw new Error(validation.errors[0]);
  }

  const dateParts = parseDate(draft.date);
  const startTime = parseTime(draft.startTime);
  const startMinutes = dateTimeToMinutes(dateParts, startTime);
  const endMinutes = draft.endTime
    ? dateTimeToMinutes(dateParts, parseTime(draft.endTime))
    : startMinutes + 60;
  const end = dateTimeFromMinutes(endMinutes);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: draft.title ?? "",
    dates: `${formatCalendarDateTime(
      dateParts,
      startTime,
    )}/${formatCalendarDateTime(end.dateParts, end.timeParts)}`,
    ctz: draft.timezone ?? "",
    location: draft.location ?? "",
    details: buildDetails(draft.notes, draft.guests ?? []),
  });

  for (const guest of draft.guests ?? []) {
    params.append("add", guest);
  }

  return `${GOOGLE_CALENDAR_CREATE_URL}?${params.toString()}`;
}
