# Rules

ComposeEnvGuard rules have stable IDs (`CEG001`…). An ID is never renumbered or reused.
Run `composeguard rules` for the same list in the terminal, or `GET /api/v1/rules` on the API.

Severity meanings:

- **error**: Compose would fail, or the configuration is definitely wrong for the analyzed files. Fails the default threshold.
- **warning**: Probably a mistake, but it can be legitimate or depend on things outside the project. Does not fail by default.
- **info**: Worth a look. Never fails by default.

Every finding carries an uncertainty note when a conclusion depends on information the scanner does not have.

---

## CEG001 — Undocumented interpolation reference

Default severity: **warning**

**Detects:** a Compose value uses `${VAR}` or `$VAR` (including forms such as `${VAR:-default}`, `${VAR:?error}`, `${VAR:+alt}`) and `VAR` is not documented in the selected environment template.

```yaml
services:
  api:
    image: example/api:${IMAGE_TAG}     # IMAGE_TAG missing from .env.example -> CEG001
    environment:
      JWT_SECRET: ${JWT_SECRET}          # JWT_SECRET missing from .env.example -> CEG001
```

**Does not detect:** whether the variable is unset at runtime. It may come from your shell, CI secrets, or an environment file the scanner did not read.

**Fix:** document the variable in the template, or list it under `external_variables` in `.composeguard.yaml` when it is supplied externally.

One finding is reported per variable name, even if it is used in several places.

---

## CEG002 — Duplicate template variable

Default severity: **warning**

**Detects:** the same name is declared more than once in the environment template.

```text
LOG_LEVEL=info
LOG_LEVEL=debug   # CEG002, reported at this line
```

**Does not detect:** which value a dotenv loader will end up using.

---

## CEG003 — Missing required env_file

Default severity: **error**

**Detects:** a service `env_file` entry points to a path that does not exist. Entries are required unless `required: false` is set (long syntax). Paths are resolved relative to the Compose file that declares them.

**Does not detect:** whether an existing env file has valid contents. Optional missing files are not reported.

**Fix:** create the file, correct the path, or mark it `required: false`.

---

## CEG004 — Potentially unused documented variable

Default severity: **info**

**Detects:** a template variable is not referenced by Compose interpolation, a service `environment` entry, or a read `env_file`.

**Does not detect:** whether application code reads the variable directly, which is common and valid. The finding says so.

---

## CEG005 — Invalid or unsupported configuration

Default severity: **error**, **warning** or **info** depending on whether analysis can continue safely.

**Detects:**

- YAML that cannot be parsed (error; the message gives a line number and never echoes the content)
- More than one YAML document in a file, duplicate mapping keys, or a recursive alias (error)
- Invalid interpolation syntax such as a lone `$` or an unclosed `${` (error)
- Unsupported constructs that change meaning and are not resolved: `include`, `extends`, custom YAML tags such as `!reset` (warning)
- Malformed dotenv lines in the template or a read env file (warning)
- Files that are not UTF-8, exceed the size limit, or resolve outside the project (error for Compose files and templates, warning for env files)
- Interpolated `env_file` paths, which cannot be verified without running Compose (info)
- A Compose file without `services` (warning)

**Does not detect:** full validation against the Compose specification schema.

---

## CEG006 — Explicit service contract mismatch

Default severity: **error** (**warning** when an env file that could declare the variable was not read)

**Detects:** a service listed in `.composeguard.yaml` requires a variable that is not declared through its `environment` or a readable `env_file`, or the contract names a service that is not defined in the analyzed Compose files.

```yaml
# .composeguard.yaml
version: 1
services:
  api:
    required_env: [DATABASE_URL, JWT_SECRET]
```

**Does not detect:** any requirement that is not written in the contract. ComposeEnvGuard never infers required variables from application code.

---

## CEG007 — Unverified private environment file

Default severity: **info**

**Detects:** an environment file exists but was not read under the default privacy policy, so the scanner cannot say which variables it defines. This covers env files referenced by a service, the project `.env` that Compose reads for interpolation, and, in the API, env files that were not included in the request.

**Does not detect:** the names or values inside the file.

**Fix:** pass `--include-env-file PATH` to read only the variable names locally (values are discarded), or document the variables in the template.

---

## CEG008 — Suspicious environment mapping

Default severity: **warning** (**error** for an empty name or a non-scalar value)

**Detects:**

- An empty variable name, such as `- "=value"` (error)
- A non-string entry in an `environment` list (error)
- A value that is a mapping or list in an `environment` mapping (error)
- A name with characters that are not valid in a shell-style identifier, such as `BAD NAME` or `MY-VAR` (warning)
- The same name defined twice in one service (warning; Compose keeps only one value)
- An empty name or an invalid name in the template (error or warning)

Names that are not valid identifiers are never echoed in reports, because a malformed line may contain a secret.

**Does not detect:** whether a value is correct for the application.
