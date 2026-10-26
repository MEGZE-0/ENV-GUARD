"""Renderers for scan reports: terminal (Rich), JSON and Markdown.

None of the renderers have access to environment values. They only print what is
already in the :class:`~compose_env_guard.models.Report`, which contains names,
paths, line numbers and fixed messages.
"""

from __future__ import annotations

from rich.console import Console
from rich.markup import escape

from .models import Finding, Report, Severity

_LABELS = {Severity.ERROR: "ERROR", Severity.WARNING: "WARNING", Severity.INFO: "INFO"}
_STYLES = {Severity.ERROR: "bold red", Severity.WARNING: "bold yellow", Severity.INFO: "bold cyan"}


def files_analyzed(report: Report) -> int:
    return sum(1 for f in report.files if f.status in ("analyzed", "keys_read"))


def render_json(report: Report) -> str:
    return report.model_dump_json(indent=2) + "\n"


def _location(finding: Finding) -> str:
    base = f"{finding.file}:{finding.line}" if finding.file and finding.line else finding.file or ""
    extras = []
    if finding.service:
        extras.append(f"service: {finding.service}")
    if base and extras:
        return f"{base} ({', '.join(extras)})"
    return base or (", ".join(extras))


def print_terminal(report: Report, console: Console) -> None:
    """Print a human-readable summary. Colour is optional: every severity has a text label."""
    console.print("ComposeEnvGuard", style="bold", highlight=False, soft_wrap=True)
    console.print()
    console.print(f"Project: {escape(report.project)}", highlight=False, soft_wrap=True)
    console.print(f"Files analyzed: {files_analyzed(report)}", highlight=False, soft_wrap=True)
    console.print(f"Services analyzed: {len(report.services)}", highlight=False, soft_wrap=True)
    console.print()

    if report.notes:
        for note in report.notes:
            console.print(f"Note: {escape(note)}", highlight=False, soft_wrap=True)
        console.print()

    console.print("Results:", style="bold", highlight=False, soft_wrap=True)
    console.print()
    if not report.findings:
        console.print("No findings.", highlight=False, soft_wrap=True)
        console.print()
    for finding in report.findings:
        label = f"[{_LABELS[finding.severity]}]"
        subject = finding.variable or finding.subject or finding.file or finding.title
        console.print(
            f"{label} {finding.rule_id} — {escape(subject)}",
            style=_STYLES[finding.severity],
            highlight=False,
            soft_wrap=True,
        )
        console.print(f"  {escape(finding.title)}", highlight=False, soft_wrap=True)
        console.print(f"  {escape(finding.message)}", highlight=False, soft_wrap=True)
        location = _location(finding)
        if location:
            console.print(f"  Location: {escape(location)}", highlight=False, soft_wrap=True)
        console.print(f"  Suggestion: {escape(finding.suggestion)}", highlight=False, soft_wrap=True)
        if finding.uncertainty:
            console.print(f"  Uncertainty: {escape(finding.uncertainty)}", highlight=False, soft_wrap=True)
        console.print()

    if report.skipped:
        console.print("Skipped or unsupported:", style="bold", highlight=False, soft_wrap=True)
        for item in report.skipped:
            prefix = f"{escape(item.path)}: " if item.path else ""
            console.print(f"  - {prefix}{escape(item.reason)}", highlight=False, soft_wrap=True)
        console.print()

    console.print("Summary:", style="bold", highlight=False, soft_wrap=True)
    console.print(f"Errors: {report.counts.error}", highlight=False, soft_wrap=True)
    console.print(f"Warnings: {report.counts.warning}", highlight=False, soft_wrap=True)
    console.print(f"Information: {report.counts.info}", highlight=False, soft_wrap=True)
    console.print()
    status = "Failed" if report.failed else "Passed"
    style = "bold red" if report.failed else "bold green"
    console.print(f"Final status: {status}", style=style, highlight=False, soft_wrap=True)


def _cell(text: str | None) -> str:
    if not text:
        return ""
    return text.replace("|", "\\|").replace("\r", " ").replace("\n", " ")


def render_markdown(report: Report) -> str:
    lines: list[str] = []
    lines.append(f"# ComposeEnvGuard report: {_cell(report.project)}")
    lines.append("")
    status = "Failed" if report.failed else "Passed"
    lines.append(f"**Final status:** {status} (fail threshold: `{report.fail_on.value}`)")
    lines.append("")
    lines.append("| Files analyzed | Services analyzed | Errors | Warnings | Information |")
    lines.append("| --- | --- | --- | --- | --- |")
    lines.append(
        f"| {files_analyzed(report)} | {len(report.services)} | {report.counts.error} "
        f"| {report.counts.warning} | {report.counts.info} |"
    )
    lines.append("")
    lines.append("## Findings")
    lines.append("")
    if not report.findings:
        lines.append("No findings.")
    else:
        lines.append("| Severity | Rule | Variable | Location | Message | Suggestion |")
        lines.append("| --- | --- | --- | --- | --- | --- |")
        for f in report.findings:
            lines.append(
                f"| {_LABELS[f.severity]} | {f.rule_id} | {_cell(f.variable or f.subject)} "
                f"| {_cell(_location(f))} "
                f"| {_cell(f.message)}"
                + (f" _Uncertainty: {_cell(f.uncertainty)}_" if f.uncertainty else "")
                + f" | {_cell(f.suggestion)} |"
            )
    lines.append("")
    if report.files:
        lines.append("## Files")
        lines.append("")
        for entry in report.files:
            lines.append(f"- `{_cell(entry.path)}` — {entry.role}, {entry.status}")
        lines.append("")
    if report.services:
        lines.append("## Services")
        lines.append("")
        for name in report.services:
            lines.append(f"- {_cell(name)}")
        lines.append("")
    if report.skipped:
        lines.append("## Skipped or unsupported")
        lines.append("")
        for item in report.skipped:
            prefix = f"`{_cell(item.path)}`: " if item.path else ""
            lines.append(f"- {prefix}{_cell(item.reason)}")
        lines.append("")
    if report.notes:
        lines.append("## Notes")
        lines.append("")
        for note in report.notes:
            lines.append(f"- {_cell(note)}")
        lines.append("")
    lines.append(
        "> This report contains variable names and locations only. No environment values are included."
    )
    return "\n".join(lines) + "\n"
