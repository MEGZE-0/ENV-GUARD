# Proposed next milestones

These are designs for separate review, not released capabilities. Version 0.1.0 remains the public preview. No implementation or release dates are committed.

## Read-only dashboard — v0.2.0 candidate

An existing local feature branch contains UI assets, demo routes and browser middleware. It is not on main and must be independently reviewed rather than included in the scanner hardening PR.

### Implementation

- Serve packaged semantic HTML, CSS and vanilla JavaScript through the optional FastAPI extra; retain CLI-only installation without web dependencies.
- Upload only explicitly selected Compose files, templates and configuration with the existing root-level filename restrictions. Do not infer host paths, read private `.env` files or add directory traversal endpoints.
- Display report counts, findings, service/file metadata, severity filters, search and local JSON/Markdown exports. Render all report content as text, never HTML.
- Keep `serve` bound to localhost. Validate Host and exact Origin (including scheme and port), reject cross-site writes and unsupported content types, and apply response security headers and a restrictive CSP. An allow-list of localhost hostnames alone is insufficient for same-origin validation.
- Provide useful empty, loading, error, disabled and success states; visible keyboard focus; labelled controls; WCAG AA contrast; reduced-motion support; no remote fonts or telemetry.
- Test installed-wheel assets, traversal rejection, malicious report text, browser origins, file-size/count boundaries, keyboard navigation, responsive layouts and report exports. Keep demo data synthetic.

### Threat model and acceptance

Untrusted files and hostile websites are adversaries; uploaded content, local machine resources and user privacy are assets. The backend must never accept host filesystem paths. Limit requests before parsing, avoid public unauthenticated binding, delete temporary content after each request, and state that deletion is not secure erasure. Do not store submitted content in browser persistence. Review this branch separately before shipping; no `serve --open` behavior is claimed by this hardening PR.

## Env Safe — separate security-sensitive project

Do not add vault commands or secret-management routes to this PR. Prefer evaluating existing maintained secret-management tools before creating a new cryptographic format.

| Concern | Proposed design requirement |
| --- | --- |
| Authenticated encryption | Use a maintained cryptographic library and a reviewed AEAD (AES-GCM or ChaCha20-Poly1305); never implement primitives. Version the envelope, authenticate metadata and use a fresh CSPRNG nonce for every write. |
| Key management | Separate data keys from encrypted files; choose and document OS-keyring or passphrase-wrapped key storage, team sharing and revocation. Never put raw keys in Git or scanner configuration. |
| Passphrase KDF | Evaluate Argon2id through a maintained library; calibrate time/memory on supported machines. Store salt and parameters in the authenticated envelope; bound attacker-controlled parameters before derivation to prevent resource exhaustion. |
| Permissions | Restrict directories and files on POSIX; explicitly apply/test Windows ACLs. Exclude plaintext temporaries and backups from repository paths. |
| Atomic writes | Write a private same-directory temporary, flush/fsync where supported, atomically replace, and test crash/recovery behavior and concurrent writers. |
| Safe input | Use hidden terminal input or carefully controlled stdin; never command-line arguments, URLs, logs or report fields. Minimize copies; Python cannot guarantee memory zeroization. |
| Rotation | Define passphrase rewrapping versus data-key rotation; test old-key revocation and fresh nonces. Account for retained Git history and backups. |
| Recovery | Choose explicit recovery-key/escrow policy. Explain that lost keys may mean permanent data loss and that recovery material is itself a secret. |
| Plaintext export | Require an explicit destination and intentional user action; apply restrictive permissions and overwrite safeguards. Document process environments, stdout, temporary files and backups as potential leaks. |
| Browser security | Begin CLI-only. A later web UI requires a separate authenticated-session design, exact-origin checks, CSP, no browser persistence, no third-party scripts and a dedicated threat review. |
| Commit safety | Ciphertext is not automatically safe to commit: offline guessing, key exposure, metadata, future algorithm failures and immutable history remain relevant. Decide against a written threat model. |

Acceptance requires independent cryptographic review, known-answer and tamper tests, corruption/partial-write tests, permission checks on Windows/Linux, key-loss and rotation exercises, KDF resource-limit tests, and canary-secret checks across every output channel. No vault security guarantee follows from this proposal.

## Scanner and adoption priorities

1. Model multi-file base-directory and override semantics before claiming full Compose compatibility; validate against official Compose fixtures and `docker compose config` using synthetic values.
2. Make unreadable environment files remain explicitly unverified for contract checks; enforce the currently unused env-file read-count constant.
3. Clarify request models in generated OpenAPI and reject browser-origin misuse before adding UI capabilities.
4. Consider SARIF and a pre-commit example only after collecting user demand; preserve local-only output and the stable JSON schema.
5. Keep Wiki release claims tied to tags and commit-specific CI evidence, with documentation checks in release review.
