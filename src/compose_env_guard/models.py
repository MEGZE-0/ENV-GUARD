"""Pydantic models shared by the scanner, reporters, CLI and HTTP API."""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

REPORT_SCHEMA_VERSION = "1.0"


class Severity(StrEnum):
    """Finding severity. ``error`` > ``warning`` > ``info``."""

    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

    @property
    def rank(self) -> int:
        return {"error": 3, "warning": 2, "info": 1}[self.value]


class FailOn(StrEnum):
    """Threshold at which a scan is reported as failed."""

    ERROR = "error"
    WARNING = "warning"
    INFO = "info"
    NEVER = "never"

    def triggers(self, severity: Severity) -> bool:
        if self is FailOn.NEVER:
            return False
        return severity.rank >= Severity[self.name].rank


class Finding(BaseModel):
    """A single diagnostic. Never contains environment values."""

    model_config = ConfigDict(extra="forbid")

    rule_id: str
    severity: Severity
    title: str
    message: str
    suggestion: str
    variable: str | None = None
    service: str | None = None
    file: str | None = None
    line: int | None = None
    subject: str | None = None  # headline subject when it is not a variable (e.g. an env_file path)
    uncertainty: str | None = None


class AnalyzedFile(BaseModel):
    """A file the scanner considered, with how it was used."""

    model_config = ConfigDict(extra="forbid")

    path: str
    role: Literal["compose", "template", "env_file", "included_env_file", "config", "project_env"]
    status: Literal["analyzed", "keys_read", "not_read", "missing", "skipped"]


class SkippedItem(BaseModel):
    """Something that was not analyzed, or an unsupported construct that was ignored."""

    model_config = ConfigDict(extra="forbid")

    path: str | None = None
    reason: str


class FindingCounts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: int = 0
    warning: int = 0
    info: int = 0


class ToolInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: Literal["compose-env-guard"] = "compose-env-guard"
    version: str


class Report(BaseModel):
    """Versioned, machine-readable scan report (shared by CLI JSON and HTTP API)."""

    model_config = ConfigDict(extra="forbid")

    schema_version: Literal["1.0"] = REPORT_SCHEMA_VERSION
    tool: ToolInfo
    project: str
    status: Literal["passed", "failed"]
    fail_on: FailOn
    counts: FindingCounts
    files: list[AnalyzedFile] = Field(default_factory=list)
    services: list[str] = Field(default_factory=list)
    findings: list[Finding] = Field(default_factory=list)
    skipped: list[SkippedItem] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)

    @property
    def failed(self) -> bool:
        return self.status == "failed"


class RuleSpec(BaseModel):
    """Public description of a rule."""

    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    default_severity: Severity
    detects: str
    does_not_detect: str
