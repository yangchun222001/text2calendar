import Ajv2020 from "ajv/dist/2020.js";
import schemaBundle from "../../../shared/schemas/extraction.schemas.json";

const BASE_URI = "https://calendar-tool.local/schemas/extraction";

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schemaBundle, BASE_URI);

function compileValidator(defName) {
  return ajv.compile({
    $ref: `${BASE_URI}#/$defs/${defName}`,
  });
}

const validateEventDraftSchema = compileValidator("EventDraft");
const validateExtractionWarningSchema = compileValidator("ExtractionWarning");
const validateExtractEventRequestSchema = compileValidator("ExtractEventRequest");
const validateExtractEventResponseSchema = compileValidator("ExtractEventResponse");
const validateExtractEventErrorSchema = compileValidator("ExtractEventError");

/** @param {Record<string, unknown>} draft */
export function assertEventDraftSemantics(draft) {
  const missing = draft.missingStartTime;
  const start = draft.startTime;
  if (missing !== (start === null)) {
    throw new Error(
      `EventDraft: missingStartTime must be true iff startTime is null; got missingStartTime=${String(
        missing,
      )}, startTime=${String(start)}`,
    );
  }
}

function assertValid(validator, data, label) {
  if (!validator(data)) {
    const msg = ajv.errorsText(validator.errors, { separator: "; " });
    throw new Error(`${label}: ${msg}`);
  }
}

/** @param {unknown} instance */
export function validateEventDraft(instance) {
  assertValid(validateEventDraftSchema, instance, "EventDraft");
  if (instance && typeof instance === "object") {
    assertEventDraftSemantics(/** @type {Record<string, unknown>} */ (instance));
  }
}

/** @param {unknown} instance */
export function validateExtractionWarning(instance) {
  assertValid(validateExtractionWarningSchema, instance, "ExtractionWarning");
}

/** @param {unknown} instance */
export function validateExtractEventRequest(instance) {
  assertValid(
    validateExtractEventRequestSchema,
    instance,
    "ExtractEventRequest",
  );
}

/** @param {unknown} instance */
export function validateExtractEventResponse(instance) {
  assertValid(
    validateExtractEventResponseSchema,
    instance,
    "ExtractEventResponse",
  );
  if (instance && typeof instance === "object" && "draft" in instance) {
    const draft = /** @type {{ draft?: unknown }} */ (instance).draft;
    if (draft && typeof draft === "object") {
      assertEventDraftSemantics(/** @type {Record<string, unknown>} */ (draft));
    }
  }
}

/** @param {unknown} instance */
export function validateExtractEventError(instance) {
  assertValid(validateExtractEventErrorSchema, instance, "ExtractEventError");
}
