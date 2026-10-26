# JSON report

`composeguard scan . --format json` and `POST /api/v1/scan` return the same document. It is versioned with `schema_version` and documented by [report.schema.json](report.schema.json) (JSON Schema, generated from the models).

## Top-level fields

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | string | `"1.0"`. Increases when a field is removed or changes meaning. Additive changes keep the same major. |
| `tool` | object | `{"name": "compose-env-guard", "version": "0.1.0"}`. |
| `project` | string | Directory name of the scanned project (never an absolute path). |
| `status` | string | `"passed"` or `"failed"`, computed from `fail_on`. |
| `fail_on` | string | `error`, `warning`, `info` or `never`. |
| `counts` | object | `{"error": n, "warning": n, "info": n}`. |
| `files` | array | Each file considered: `path`, `role` and `status` (see below). |
| `services` | array | Sorted, unique service names. |
| `findings` | array | Sorted by rule, file, line, variable, service. |
| `skipped` | array | Items not analyzed, each with `path` (optional) and `reason`. |
| `notes` | array | Explanations, for example that no template was found. |

## Finding

| Field | Notes |
| --- | --- |
| `rule_id` | `CEG001`… |
| `severity` | `error`, `warning` or `info`. |
| `title` | The rule title. |
| `message` | What was found. Contains names and locations only. |
| `suggestion` | What to do. |
| `variable` | Variable name, or `null`. |
| `service` | Service name, or `null`. |
| `file` | Project-relative path, or `null`. |
| `line` | 1-based line number, or `null` when unknown. |
| `subject` | Headline subject when it is not a variable, such as an env file path. |
| `uncertainty` | What the scanner could not verify, or `null`. |

## Files

`role` is one of `compose`, `template`, `env_file`, `included_env_file`, `config`, `project_env`.

`status` is one of:

- `analyzed`: parsed for structure and references.
- `keys_read`: variable names read, values discarded.
- `not_read`: exists but was not read (privacy policy).
- `missing`: does not exist.
- `skipped`: could not be analyzed (see `skipped`).

## Guarantees

- No environment values, ever. Fields hold names, paths, numbers and fixed text.
- Deterministic: the same inputs produce byte-identical output.
- Absolute paths and timestamps are not included, so reports can be compared between machines.

## Compatibility

Parse with a JSON Schema validator or with `Report.model_validate` from `compose_env_guard.models`. Ignore unknown fields so future minor versions stay compatible.
