# Broken example

A Compose project with deliberate configuration mistakes. Use it to see what ComposeEnvGuard reports.

    composeguard scan examples/broken-project

Expected findings: CEG001 (JWT_SECRET), CEG003 (./config/missing.env), CEG002 (LOG_LEVEL),
CEG004 (LEGACY_API_URL). The command exits with code 1 because CEG003 is an error.
