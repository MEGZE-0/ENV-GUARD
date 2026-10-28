"""Command-line interface: ``composeguard``."""

from __future__ import annotations

import io
import json
import os
import sys
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console

from . import __version__
from .models import FailOn
from .reporters import format_separator, print_terminal, render_json, render_markdown
from .rules import RULES
from .scanner import ScanOptions, scan_project
from .security import ScanInputError

EXIT_OK = 0
EXIT_FINDINGS = 1
EXIT_INPUT_ERROR = 2

app = typer.Typer(
    name="composeguard",
    no_args_is_help=True,
    add_completion=False,
    rich_markup_mode=None,
    help=(
        "ComposeEnvGuard checks Docker Compose environment configuration before deployment. "
        "It reads Compose files and environment templates, never environment values, "
        "and never runs containers."
    ),
    epilog=(
        "Exit codes: 0 = no findings at or above the --fail-on threshold; "
        "1 = threshold reached; 2 = invalid input or execution error."
    ),
)


class OutputFormat(str):
    TERMINAL = "terminal"
    JSON = "json"
    MARKDOWN = "markdown"


_FORMATS = ("terminal", "json", "markdown")


def _no_color() -> bool:
    """Honour https://no-color.org: any non-empty NO_COLOR disables ANSI output entirely."""
    return bool(os.environ.get("NO_COLOR"))


def _console(**kwargs) -> Console:
    if _no_color():
        kwargs.setdefault("color_system", None)
    return Console(highlight=False, soft_wrap=True, **kwargs)


def _stderr_console() -> Console:
    return _console(stderr=True)


@app.command("scan")
def scan_command(
    path: Annotated[
        Path, typer.Argument(help="Project directory to scan (read-only).", show_default=True)
    ] = Path("."),
    format_: Annotated[
        str,
        typer.Option("--format", "-f", help="Output format.", case_sensitive=False),
    ] = "terminal",
    output: Annotated[
        Path | None,
        typer.Option("--output", "-o", help="Write the report to this file instead of stdout."),
    ] = None,
    fail_on: Annotated[
        FailOn,
        typer.Option("--fail-on", help="Exit with code 1 when findings reach this severity."),
    ] = FailOn.ERROR,
    env_example: Annotated[
        str | None,
        typer.Option(
            "--env-example",
            help="Environment template, relative to the project (default: .env.example or .env.sample).",
        ),
    ] = None,
    compose: Annotated[
        list[str] | None,
        typer.Option(
            "--compose",
            help="Compose file relative to the project. Repeat to analyze several files.",
        ),
    ] = None,
    config: Annotated[
        str | None,
        typer.Option("--config", help="ComposeGuard configuration file (default: .composeguard.yaml)."),
    ] = None,
    include_env_file: Annotated[
        list[str] | None,
        typer.Option(
            "--include-env-file",
            help="Read variable NAMES from this env file (values are discarded). Repeatable.",
        ),
    ] = None,
) -> None:
    """Scan a Docker Compose project for environment configuration problems."""
    fmt = format_.lower()
    if fmt not in _FORMATS:
        _stderr_console().print(f"Error: --format must be one of: {', '.join(_FORMATS)}.")
        raise typer.Exit(EXIT_INPUT_ERROR)

    options = ScanOptions(
        compose_files=list(compose or []),
        env_example=env_example,
        include_env_files=list(include_env_file or []),
        config_path=config,
        fail_on=fail_on,
    )
    try:
        report = scan_project(path, options)
    except ScanInputError as exc:
        _stderr_console().print(f"Error: {exc}")
        raise typer.Exit(EXIT_INPUT_ERROR) from None
    except Exception as exc:
        _stderr_console().print(
            f"Error: unexpected failure during scan ({type(exc).__name__}). The analysis was not completed."
        )
        raise typer.Exit(EXIT_INPUT_ERROR) from None

    if fmt == "json":
        payload = render_json(report)
    elif fmt == "markdown":
        payload = render_markdown(report)
    else:
        payload = None

    if output is not None:
        try:
            if payload is None:
                payload = _terminal_text(report)
            output.write_text(payload, encoding="utf-8")
        except OSError as exc:
            _stderr_console().print(f"Error: could not write report: {exc.strerror or 'I/O error'}")
            raise typer.Exit(EXIT_INPUT_ERROR) from None
        status = "failed" if report.failed else "passed"
        typer.echo(f"Report written to {output} (status: {status}).")
    elif payload is not None:
        sys.stdout.write(payload)
    else:
        print_terminal(report, _console())

    raise typer.Exit(EXIT_FINDINGS if report.failed else EXIT_OK)


def _terminal_text(report) -> str:
    buffer = io.StringIO()
    console = Console(file=buffer, width=100, color_system=None, highlight=False, soft_wrap=True)
    print_terminal(report, console)
    return buffer.getvalue()


@app.command("rules")
def rules_command(
    format_: Annotated[str, typer.Option("--format", "-f", help="terminal or json.")] = "terminal",
) -> None:
    """List implemented rules, what they detect, and what they do not."""
    if format_.lower() == "json":
        payload = [rule.model_dump(mode="json") for rule in RULES]
        typer.echo(json.dumps(payload, indent=2))
        return
    console = _console()
    sep = format_separator(console)
    console.print("ComposeEnvGuard rules", style="bold")
    for rule in RULES:
        console.print()
        console.print(f"{rule.id} {sep} {rule.title} [{rule.default_severity.value}]", style="bold")
        console.print(f"  Detects: {rule.detects}")
        console.print(f"  Does not detect: {rule.does_not_detect}")


@app.command("serve")
def serve_command(
    host: Annotated[
        str,
        typer.Option(help="Interface to bind. Keep 127.0.0.1 unless you add authentication and TLS."),
    ] = "127.0.0.1",
    port: Annotated[int, typer.Option(help="TCP port.", min=1, max=65535)] = 8000,
) -> None:
    """Run the optional local HTTP API (requires the 'api' extra)."""
    try:
        import uvicorn
    except ImportError:
        _stderr_console().print(
            "Error: the HTTP API needs the optional dependencies. "
            'Install them with: pip install "compose-env-guard[api]"'
        )
        raise typer.Exit(EXIT_INPUT_ERROR) from None
    uvicorn.run("compose_env_guard.api:app", host=host, port=port, log_level="info")


@app.command("version")
def version_command() -> None:
    """Show the installed version."""
    typer.echo(f"composeguard {__version__}")


def main() -> None:
    app()


if __name__ == "__main__":  # pragma: no cover
    main()
