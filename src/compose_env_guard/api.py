"""Optional local HTTP API. It calls the same :func:`scan_project` engine as the CLI.

The API never accepts host filesystem paths. Clients send file *contents* keyed by
root-level file names; the contents are written to a private temporary directory,
scanned, and deleted. Nothing is stored between requests.

Run locally (bound to localhost by default)::

    pip install "compose-env-guard[api]"
    uvicorn compose_env_guard.api:app --host 127.0.0.1 --port 8000

Do not expose this service publicly without authentication, TLS and rate limiting.
"""

from __future__ import annotations

import json
import logging
import os
import re
import tempfile
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator

from . import __version__
from .models import FailOn, Report, RuleSpec
from .rules import RULES
from .scanner import ScanOptions, scan_project
from .security import (
    API_MAX_FILE_BYTES,
    API_MAX_FILES,
    API_MAX_REQUEST_BYTES,
    COMPOSE_NAMES,
    ScanInputError,
    UnsafeNameError,
    validate_api_filename,
)

logger = logging.getLogger("compose_env_guard.api")

_COMPOSE_RE = re.compile(r"^(compose|docker-compose)(\.[A-Za-z0-9_-]{1,64})?\.(yaml|yml)$")
_TEMPLATE_RE = re.compile(r"^\.env\.(example|sample)$")


class ScanRequest(BaseModel):
    """Request body for ``POST /api/v1/scan``."""

    model_config = ConfigDict(extra="forbid")

    files: dict[str, str] = Field(
        description="Mapping of root-level file names to their UTF-8 text contents.",
    )
    fail_on: FailOn = Field(default=FailOn.ERROR, description="Severity that marks the scan as failed.")
    env_example: str | None = Field(
        default=None, description="Template file name to use, e.g. '.env.sample'."
    )
    compose_files: list[str] | None = Field(
        default=None, description="Compose file names to analyze. Defaults to the first standard name found."
    )

    @field_validator("files")
    @classmethod
    def _check_files(cls, files: dict[str, str]) -> dict[str, str]:
        if not files:
            raise ValueError("at least one file is required")
        if len(files) > API_MAX_FILES:
            raise ValueError(f"at most {API_MAX_FILES} files are allowed")
        total = 0
        for name, content in files.items():
            try:
                validate_api_filename(name)
            except UnsafeNameError as exc:
                raise ValueError(str(exc)) from None
            size = len(content.encode("utf-8"))
            if size > API_MAX_FILE_BYTES:
                raise ValueError(f"each file may be at most {API_MAX_FILE_BYTES} bytes")
            total += size
        if total > API_MAX_REQUEST_BYTES:
            raise ValueError("the files together exceed the request size limit")
        return files

    @model_validator(mode="after")
    def _check_selection(self) -> ScanRequest:
        names = set(self.files)
        if self.compose_files is not None:
            for name in self.compose_files:
                if name not in names or not _COMPOSE_RE.match(name):
                    raise ValueError("compose_files must name Compose files included in files")
        elif not any(name in names for name in COMPOSE_NAMES) and not any(
            _COMPOSE_RE.match(name) for name in names
        ):
            raise ValueError("files must include a Compose file such as compose.yaml")
        if self.env_example is not None and (
            self.env_example not in names or not _TEMPLATE_RE.match(self.env_example)
        ):
            raise ValueError("env_example must name a template included in files")
        return self


def _sanitize_validation_errors(exc: ValidationError) -> list[dict[str, Any]]:
    """Keep location and message only; pydantic's ``input`` field may echo file contents."""
    return [
        {
            "loc": [str(part) for part in err.get("loc", ())],
            "msg": str(err.get("msg", "invalid value")),
            "type": str(err.get("type", "value_error")),
        }
        for err in exc.errors(include_input=False, include_url=False)
    ]


async def _read_limited_body(request: Request, limit: int) -> bytes:
    declared = request.headers.get("content-length")
    if declared is not None:
        try:
            if int(declared) > limit:
                raise HTTPException(status_code=413, detail="Request body is too large.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header.") from None
    chunks: list[bytes] = []
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > limit:
            raise HTTPException(status_code=413, detail="Request body is too large.")
        chunks.append(chunk)
    return b"".join(chunks)


def _run_scan(payload: ScanRequest) -> Report:
    with tempfile.TemporaryDirectory(prefix="composeguard-") as workdir:
        for name, content in payload.files.items():
            path = os.path.join(workdir, name)
            with open(path, "x", encoding="utf-8", newline="") as handle:
                handle.write(content)
        options = ScanOptions(
            compose_files=list(payload.compose_files or []),
            env_example=payload.env_example,
            fail_on=payload.fail_on,
            project_name="api-request",
            verify_existence=False,
        )
        return scan_project(workdir, options)


def create_app() -> FastAPI:
    app = FastAPI(
        title="ComposeEnvGuard API",
        version=__version__,
        description=(
            "Local API for checking Docker Compose environment configuration. "
            "Send file contents, receive a structured report. No environment values are "
            "returned or stored. Do not expose publicly without authentication and TLS."
        ),
    )

    @app.exception_handler(Exception)
    async def _unhandled(_request: Request, exc: Exception) -> JSONResponse:
        # Log only the exception type: messages may contain file fragments.
        logger.error("unhandled error in ComposeEnvGuard API: %s", type(exc).__name__)
        return JSONResponse(status_code=500, content={"detail": "Internal server error."})

    @app.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok", "version": __version__}

    @app.get("/api/v1/rules", tags=["rules"], response_model=list[RuleSpec])
    async def rules() -> list[RuleSpec]:
        return list(RULES)

    @app.post(
        "/api/v1/scan",
        tags=["scan"],
        response_model=Report,
        responses={
            413: {"description": "Request body exceeds the size limit."},
            422: {"description": "Invalid request data or unusable input."},
        },
    )
    async def scan(request: Request) -> JSONResponse:
        body = await _read_limited_body(request, API_MAX_REQUEST_BYTES)
        try:
            data = json.loads(body.decode("utf-8")) if body else None
        except (UnicodeDecodeError, ValueError):
            return JSONResponse(status_code=422, content={"detail": "Request body must be valid UTF-8 JSON."})
        if data is None:
            return JSONResponse(status_code=422, content={"detail": "A JSON body is required."})
        try:
            payload = ScanRequest.model_validate(data)
        except ValidationError as exc:
            return JSONResponse(status_code=422, content={"detail": _sanitize_validation_errors(exc)})
        try:
            report = await run_in_threadpool(_run_scan, payload)
        except ScanInputError as exc:
            return JSONResponse(status_code=422, content={"detail": str(exc)})
        return JSONResponse(status_code=200, content=report.model_dump(mode="json"))

    return app


app = create_app()
