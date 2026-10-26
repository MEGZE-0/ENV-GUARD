# Limitations

ComposeEnvGuard is deliberately narrow: it reads files and reports what it can prove or what it must flag as uncertain. This page lists what it does **not** do, so you can decide whether it fits your project.

## Things it cannot verify

- **Runtime values.** A variable that is missing from `.env.example` may be set by your shell, CI secrets, a cloud secret manager, or a file the scanner did not read. Findings say "not documented" and "not proof that it is missing".
- **Secret contents and correctness.** Values are never read unless you explicitly include a file for name checks, and even then they are discarded.
- **Image contents.** The scanner does not inspect images, so variables an image's entrypoint expects are unknown.
- **Application code.** A variable used only in code is reported as "potentially unused" (CEG004). That is an info-level hint, not a verdict.
- **Environment of the machine running Compose.** Host variables are not inspected.

## Compose features that are not fully modelled

| Feature | What happens |
| --- | --- |
| Interpolation | Parsed for `$VAR`, `${VAR}`, the default / required / alternative operators, `$$`, and nested defaults. Values are never expanded. Syntax Compose would reject is reported as CEG005. |
| `environment` (mapping and list), `env_file` (string, list, long form with `required`) | Modelled. |
| Multiple Compose files (`--compose`, repeatable) | Each file is parsed on its own. Service environment and env files are **combined** across files for contract checks (CEG006) and for "observed" variables (CEG004). Override semantics such as later files replacing earlier values are **not** applied; the union is used. |
| Compose's automatic `compose.override.yaml` | Not loaded. If it exists, a skipped-item note says so. Pass it with `--compose` to include it. |
| `extends` | Not resolved. The base service's variables are not analyzed; a CEG005 warning is raised. |
| `include` | Not resolved; CEG005 warning. |
| Custom YAML tags such as `!reset` and `!override` | Not applied; CEG005 warning. |
| YAML anchors, aliases and `<<` merge keys | Supported. A problem inside a shared anchor is reported once, not once per alias. |
| `profiles` | All services are analyzed regardless of profile. |
| `secrets`, `configs`, `build.args`, `x-` extension fields | Interpolation references in these values are included in CEG001, because Compose still needs the variable. Their values are not treated as container environment. |
| The project `.env` file | Compose reads it for interpolation. It is **not read** by default; CEG007 says so. Use `--include-env-file .env` to check its names. Its keys are not used as container environment. |
| `env_file` paths containing interpolation (`./${DIR}/x.env`) | Cannot be resolved without Compose; reported as CEG005 (info) and not verified. |
| `env_file` paths outside the project | Not followed; CEG005 warning. |
| Compose schema validation | Not performed. Use `docker compose config` for full validation. |
| `docker compose --env-file` | Not supported. The template is chosen with `--env-example`. |
| Nested projects | Supported through explicit paths, for example `--compose services/api/compose.yaml`. The scanner never searches subdirectories. |

## Scope limits

- **Discovery is non-recursive.** The scanner looks only in the project directory you give it. This keeps it fast and avoids surprises in `.git`, virtual environments and build folders.
- **One template per scan.** If both `.env.example` and `.env.sample` exist, `.env.example` is used (the first existing name in the discovery order). Use `--env-example` to choose the other one.
- **Size limits.** Compose files up to 1 MiB, env files and templates up to 256 KiB, configuration up to 64 KiB, at most 10 Compose files. Larger files are reported and skipped.
- **Encoding.** Files must be UTF-8 (a BOM is accepted). Other encodings are reported as CEG005 errors.
- **Line numbers.** Reliable for ordinary YAML and dotenv. For a problem inside an anchor, the line is where the anchor is defined.

## API limits

- The API accepts file contents only for root-level files with known names, and never reads host paths.
- Because uploaded contents are the only files it can see, env files referenced by a service are reported as **not supplied** (CEG007) rather than missing (CEG003).
- No authentication, no rate limiting, no TLS. Bind to localhost, or put an authenticating reverse proxy with TLS in front of it.
- Requests are limited to 1 MiB, 20 files, and 256 KiB per file.

## Platform limits

- Developed and tested on Linux with Python 3.11. CI runs Python 3.11, 3.12 and 3.13 on Ubuntu.
- Windows paths are handled by normalising separators, but the test suite has not been run on Windows in this release.
- The GitHub Action requires `bash` on the runner (available on GitHub-hosted Linux, macOS and Windows runners) and network access to PyPI when it installs the scanner.
- The Docker image and the Docker tests require a Docker daemon. They are skipped automatically when none is available.

## Reporting a limitation as a bug

If the scanner reports something that Compose would accept, or misses something Compose would reject, open an issue with a minimal, sanitised Compose file. Do not paste real secrets.
