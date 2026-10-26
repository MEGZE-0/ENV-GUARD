# ComposeEnvGuard container image.
#
# CLI:  docker run --rm -v "$PWD:/workspace:ro" compose-env-guard scan /workspace
# API:  see compose.yaml (binds to 127.0.0.1 on the host)
#
# The image needs no database, no Docker socket, no privileges and no network access
# at runtime for scanning. It runs as an unprivileged user.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /opt/compose-env-guard

COPY pyproject.toml README.md LICENSE ./
COPY src ./src

RUN python -m pip install ".[api]" \
    && groupadd --system --gid 10001 composeguard \
    && useradd --system --uid 10001 --gid composeguard --no-create-home --shell /usr/sbin/nologin composeguard

USER 10001:10001

# Mount the project read-only at /workspace (see docs/quickstart.md).
WORKDIR /workspace

ENTRYPOINT ["composeguard"]
CMD ["--help"]
