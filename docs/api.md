# HTTP API

The API is optional and local. It uses the same scanning engine as the CLI.

## Run it

With Docker Compose (publishes port 8000 on `127.0.0.1` only):

```bash
docker compose up --build -d
open http://localhost:8000/docs      # or visit it in your browser
docker compose down
```

Without Docker:

```bash
python -m pip install ".[api]"
composeguard serve                   # binds to 127.0.0.1:8000
```

## Endpoints

| Method and path | Purpose | Success |
| --- | --- | --- |
| `GET /health` | Liveness check. | `200 {"status": "ok", "version": "..."}` |
| `GET /api/v1/rules` | The rule registry. | `200` list of rules |
| `POST /api/v1/scan` | Scan uploaded file contents. | `200` report (findings included) |
| `GET /docs` | Interactive OpenAPI documentation. | `200` |

## Scan request

```json
{
  "files": {
    "compose.yaml": "services:\n  api:\n    image: example/api:${IMAGE_TAG}\n",
    ".env.example": "IMAGE_TAG=latest\n"
  },
  "fail_on": "error",
  "env_example": ".env.example",
  "compose_files": ["compose.yaml"]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `files` | yes | Mapping of file name to UTF-8 text. Root-level names only. |
| `fail_on` | no | `error` (default), `warning`, `info` or `never`. Sets `status` in the report. |
| `env_example` | no | Name of a template included in `files`. |
| `compose_files` | no | Names of Compose files included in `files`. Defaults to the first standard name found. |

**Allowed file names:**

- Compose: `compose.yaml`, `compose.yml`, `docker-compose.yml`, `docker-compose.yaml`, and variants such as `compose.prod.yaml`.
- Template: `.env.example` or `.env.sample`.
- Configuration: `.composeguard.yaml` or `.composeguard.yml`.

Env files with other names are **not accepted**. A service's `env_file` is therefore reported as not supplied (CEG007), not as missing (CEG003).

## Example

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/scan \
  -H 'Content-Type: application/json' \
  -d '{"files": {"compose.yaml": "services:\n  api:\n    image: example/api:${IMAGE_TAG}\n", ".env.example": "IMAGE_TAG=latest\n"}}'
```

Response (abridged, real output):

```json
{
  "schema_version": "1.0",
  "tool": {"name": "compose-env-guard", "version": "0.1.0"},
  "project": "api-request",
  "status": "passed",
  "fail_on": "error",
  "counts": {"error": 0, "warning": 0, "info": 0},
  "findings": []
}
```

## Status codes

| Code | Meaning |
| --- | --- |
| `200` | The scan completed. Findings, including errors, are a successful response. |
| `413` | The request body exceeds 1 MiB. |
| `422` | The request is invalid: bad JSON, an unsafe or unknown file name, too many files, a file over 256 KiB, no Compose file, or an unusable input. The response describes the problem with field locations and never echoes submitted content. |
| `500` | Unexpected server error. The body is `{"detail": "Internal server error."}`. Details are logged by exception type only. |

## Guarantees

- The API never reads host filesystem paths. File names are validated to be plain, root-level names from an allow-list.
- Uploaded content is written to a private temporary directory, scanned and deleted. Nothing is stored between requests.
- Responses never include environment values. Validation errors do not echo input.
- No authentication, accounts or telemetry.

## Security limitations

The API is designed for **local use** by one developer or a trusted CI job. Before exposing it beyond your machine you must add, at a minimum:

- authentication (for example an authenticating reverse proxy),
- TLS termination,
- rate limiting and request timeouts,
- network controls so only intended clients can reach it.

Do not publish the Docker Compose port on `0.0.0.0` or on a public address as shipped.
