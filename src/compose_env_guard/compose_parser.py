"""Compose YAML analysis based on the YAML node tree.

The parser works on composed nodes (not constructed Python objects) so that it
can attach line numbers to every finding. It supports YAML anchors, aliases and
``<<`` merge keys. Values are only inspected for structure and interpolation
references; they are never reported.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

import yaml
from yaml.nodes import MappingNode, Node, ScalarNode, SequenceNode

from .interpolation import InterpolationRef, InterpolationSyntaxError, parse_references
from .models import Finding, Severity
from .rules import make_finding
from .security import VALID_VARIABLE_NAME

_MERGE_TAG = "tag:yaml.org,2002:merge"
_NULL_TAG = "tag:yaml.org,2002:null"
_STR_TAG = "tag:yaml.org,2002:str"
_MAX_DEPTH = 64
_TRUE = {"true", "yes", "on"}
_FALSE = {"false", "no", "off"}
_SAFE_TAG = re.compile(r"^![A-Za-z_\-]{1,32}$")
_YAML_TAG_PREFIX = "tag:yaml.org,2002:"
# Core tags that ordinary Compose values use, including implicitly resolved ones such as
# timestamps. Anything else (local tags like !reset and !!python/... shorthands) is unsupported.
_CORE_TAGS = frozenset({"str", "int", "float", "bool", "null", "seq", "map", "merge", "timestamp"})


def _is_unsupported_tag(tag: str) -> bool:
    if tag.startswith(_YAML_TAG_PREFIX):
        return tag[len(_YAML_TAG_PREFIX) :] not in _CORE_TAGS
    return True


@dataclass(frozen=True)
class EnvDecl:
    name: str
    line: int


@dataclass(frozen=True)
class EnvFileEntry:
    path: str
    required: bool
    line: int


@dataclass
class ServiceFacts:
    name: str
    line: int
    environment: dict[str, EnvDecl] = field(default_factory=dict)
    env_files: list[EnvFileEntry] = field(default_factory=list)


@dataclass(frozen=True)
class RefOccurrence:
    ref: InterpolationRef
    file: str
    line: int
    service: str | None


@dataclass
class ComposeFacts:
    path: str
    services: dict[str, ServiceFacts] = field(default_factory=dict)
    references: list[RefOccurrence] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    has_services_section: bool = False


def parse_compose(text: str, path: str) -> ComposeFacts:
    """Analyze the text of one Compose file. Never raises for bad content."""
    facts = ComposeFacts(path=path)
    collector = _Collector(facts)
    try:
        documents = list(yaml.compose_all(text, Loader=yaml.SafeLoader))
    except yaml.YAMLError as exc:
        line = _problem_line(exc)
        collector.issue(
            "CEG005",
            Severity.ERROR,
            "The YAML could not be parsed.",
            "Fix the YAML syntax. Compose will not run with invalid YAML.",
            line,
        )
        return facts

    if len(documents) > 1:
        collector.issue(
            "CEG005",
            Severity.ERROR,
            "The file contains multiple YAML documents, which is not supported.",
            "Keep one YAML document per Compose file.",
            documents[1].start_mark.line + 1 if documents[1] is not None else None,
        )
    root = documents[0] if documents else None
    if root is None:
        collector.issue(
            "CEG005",
            Severity.WARNING,
            "The Compose file is empty; there is nothing to analyze.",
            "Add a services section or remove the file from the scan.",
            None,
        )
        return facts
    collector.sweep_tags(root)
    if not isinstance(root, MappingNode):
        collector.issue(
            "CEG005",
            Severity.ERROR,
            "The top level of the Compose file must be a mapping.",
            "Start the file with keys such as 'services:'.",
            root.start_mark.line + 1,
        )
        return facts

    for key, key_node, value in collector.pairs(root, top_level=True):
        if key == "services":
            facts.has_services_section = True
            collector.services(value)
        elif key == "include":
            collector.issue(
                "CEG005",
                Severity.WARNING,
                "The 'include' directive is not resolved; included variables are not analyzed.",
                "Analyze included files explicitly with --compose, or accept the reduced coverage.",
                key_node.start_mark.line + 1,
            )
            collector.scan_values(value, None, 0)
        else:
            collector.scan_values(value, None, 0)

    if not facts.has_services_section:
        collector.issue(
            "CEG005",
            Severity.WARNING,
            "The Compose file has no 'services' section.",
            "Confirm this file is meant to be analyzed; it contributes no service environment.",
            None,
        )
    return facts


def _problem_line(exc: yaml.YAMLError) -> int | None:
    mark = getattr(exc, "problem_mark", None)
    return mark.line + 1 if mark is not None else None


class _Collector:
    def __init__(self, facts: ComposeFacts) -> None:
        self.facts = facts
        self._issue_keys: set[tuple[str, int | None, str]] = set()
        self._scalars_seen: set[int] = set()
        self._mappings_seen: set[int] = set()
        self._active: set[int] = set()
        self._value_nodes_reported: set[int] = set()
        self._suppress = False

    # -- helpers -----------------------------------------------------------------

    def issue(
        self,
        rule_id: str,
        severity: Severity,
        message: str,
        suggestion: str,
        line: int | None,
        *,
        variable: str | None = None,
        service: str | None = None,
    ) -> None:
        if self._suppress:
            return
        key = (rule_id, line, message)
        if key in self._issue_keys:
            return
        self._issue_keys.add(key)
        self.facts.findings.append(
            make_finding(
                rule_id,
                message,
                suggestion,
                severity=severity,
                variable=variable,
                service=service,
                file=self.facts.path,
                line=line,
            )
        )

    @staticmethod
    def line_of(node: Node) -> int:
        return node.start_mark.line + 1

    def pairs(self, node: MappingNode, *, top_level: bool = False):
        """Yield ``(key, key_node, value_node)`` honouring ``<<`` merges and reporting duplicates."""
        explicit: dict[str, tuple[Node, Node]] = {}
        merged: dict[str, tuple[Node, Node]] = {}
        for key_node, value_node in node.value:
            if isinstance(key_node, ScalarNode) and key_node.tag == _MERGE_TAG:
                sources = value_node.value if isinstance(value_node, SequenceNode) else [value_node]
                for source in sources:
                    if isinstance(source, MappingNode):
                        for key, k_node, v_node in self.pairs(source):
                            merged.setdefault(key, (k_node, v_node))
                    else:
                        self.issue(
                            "CEG005",
                            Severity.ERROR,
                            "A YAML merge key (<<) must reference a mapping.",
                            "Use '<<: *anchor' where the anchor points to a mapping.",
                            self.line_of(key_node),
                        )
                continue
            if not isinstance(key_node, ScalarNode):
                self.issue(
                    "CEG005",
                    Severity.ERROR,
                    "Mapping keys must be plain scalars.",
                    "Use simple string keys.",
                    self.line_of(key_node),
                )
                continue
            key = key_node.value
            if key in explicit:
                self.issue(
                    "CEG005",
                    Severity.ERROR,
                    f"The key '{key}' is defined more than once in the same mapping.",
                    "Remove the duplicate key. Compose rejects duplicate keys.",
                    self.line_of(key_node),
                )
                continue
            explicit[key] = (key_node, value_node)
        result = dict(merged)
        result.update(explicit)
        for key, (k_node, v_node) in result.items():
            yield key, k_node, v_node

    # -- traversal ------------------------------------------------------------------

    def scan_values(self, node: Node, service: str | None, depth: int) -> None:
        """Collect interpolation references from every scalar value below ``node``."""
        if depth > _MAX_DEPTH:
            self.issue(
                "CEG005",
                Severity.ERROR,
                "The YAML nesting is too deep to analyze.",
                "Simplify the structure of this section.",
                self.line_of(node),
            )
            return
        if id(node) in self._active:
            self.issue(
                "CEG005",
                Severity.ERROR,
                "A YAML alias refers to one of its own parents (recursive structure).",
                "Remove the recursive alias.",
                self.line_of(node),
            )
            return
        if isinstance(node, ScalarNode):
            if id(node) in self._scalars_seen:
                return
            self._scalars_seen.add(id(node))
            if node.tag == _STR_TAG or _is_unsupported_tag(node.tag):
                self._collect_refs(node.value, service, self.line_of(node))
            return
        if id(node) in self._mappings_seen:
            return
        self._mappings_seen.add(id(node))
        self._active.add(id(node))
        try:
            if isinstance(node, MappingNode):
                for _key, _k_node, value in self.pairs(node):
                    self.scan_values(value, service, depth + 1)
            elif isinstance(node, SequenceNode):
                for item in node.value:
                    self.scan_values(item, service, depth + 1)
        finally:
            self._active.discard(id(node))

    def sweep_tags(self, root: Node) -> None:
        """Report every node with an unsupported tag exactly once, wherever it appears.

        Walks the whole tree, so tags are found even in fields that are read by other code
        paths (such as ``image``). Tags are never constructed into Python objects.
        """
        seen: set[int] = set()
        stack: list[Node] = [root]
        while stack:
            node = stack.pop()
            if id(node) in seen:
                continue
            seen.add(id(node))
            if _is_unsupported_tag(node.tag):
                self._unsupported_tag(node)
            if isinstance(node, MappingNode):
                for key_node, value_node in node.value:
                    stack.append(key_node)
                    stack.append(value_node)
            elif isinstance(node, SequenceNode):
                stack.extend(node.value)

    def _unsupported_tag(self, node: Node) -> None:
        tag = node.tag if _SAFE_TAG.match(node.tag) else "custom"
        self.issue(
            "CEG005",
            Severity.WARNING,
            f"The YAML tag {tag} is not supported; its override semantics are not applied.",
            "Replace the tagged value with a plain value, or review this section manually.",
            self.line_of(node),
        )

    def _collect_refs(self, value: str, service: str | None, line: int) -> None:
        if "$" not in value:
            return
        try:
            refs = parse_references(value)
        except InterpolationSyntaxError:
            self.issue(
                "CEG005",
                Severity.ERROR,
                "Invalid interpolation syntax.",
                "Escape a literal dollar sign as $$, and make sure every ${ has a closing }.",
                line,
                service=service,
            )
            return
        for ref in refs:
            self.facts.references.append(
                RefOccurrence(ref=ref, file=self.facts.path, line=line, service=service)
            )

    # -- services ---------------------------------------------------------------------

    def services(self, node: Node) -> None:
        if not isinstance(node, MappingNode):
            self.issue(
                "CEG005",
                Severity.ERROR,
                "The 'services' section must be a mapping of service names.",
                "Define each service as a key under 'services:'.",
                self.line_of(node),
            )
            return
        for name, name_node, value in self.pairs(node):
            self.service(name, name_node, value)

    def service(self, name: str, name_node: Node, node: Node) -> None:
        line = self.line_of(name_node)
        if not isinstance(node, MappingNode):
            self.issue(
                "CEG005",
                Severity.ERROR,
                f"Service {name} must be a mapping.",
                "Define the service options as keys under the service name.",
                line,
                service=name,
            )
            return
        facts = ServiceFacts(name=name, line=line)
        self.facts.services[name] = facts
        self.scan_values(node, name, 0)
        for key, _k_node, value in self.pairs(node):
            if key == "environment":
                self._quietly_if_seen(value, self._environment, name, facts, value)
            elif key == "env_file":
                self._quietly_if_seen(value, self._env_file, name, facts, value)
            elif key == "extends":
                self.issue(
                    "CEG005",
                    Severity.WARNING,
                    f"'extends' in service {name} is not resolved; base-service variables are not analyzed.",
                    "Analyze the base file explicitly with --compose, or accept the reduced coverage.",
                    self.line_of(value),
                    service=name,
                )

    def _quietly_if_seen(self, node: Node, handler, service: str, facts: ServiceFacts, value: Node) -> None:
        """Process a value; problems are reported only the first time a shared (aliased) node is seen."""
        already = id(node) in self._value_nodes_reported
        self._value_nodes_reported.add(id(node))
        previous = self._suppress
        self._suppress = already
        try:
            handler(service, facts, value)
        finally:
            self._suppress = previous

    def _environment(self, service: str, facts: ServiceFacts, node: Node) -> None:
        if isinstance(node, ScalarNode) and node.tag == _NULL_TAG:
            return
        if isinstance(node, MappingNode):
            for key, key_node, value in self.pairs(node):
                line = self.line_of(key_node)
                if not key.strip():
                    self.issue(
                        "CEG008",
                        Severity.ERROR,
                        f"Service {service} has an environment entry with an empty variable name.",
                        "Remove the entry or give it a variable name.",
                        line,
                        service=service,
                    )
                    continue
                if not VALID_VARIABLE_NAME.match(key):
                    self.issue(
                        "CEG008",
                        Severity.WARNING,
                        f"Service {service} has an environment entry with an invalid variable name.",
                        "Use letters, digits and underscores, starting with a letter or underscore.",
                        line,
                        service=service,
                    )
                    continue
                if isinstance(value, (MappingNode, SequenceNode)):
                    self.issue(
                        "CEG008",
                        Severity.ERROR,
                        f"{key} in service {service} must have a scalar value.",
                        "Give the variable a single string, number, boolean or empty value.",
                        line,
                        variable=key,
                        service=service,
                    )
                    continue
                self._declare(service, facts, key, line)
            return
        if isinstance(node, SequenceNode):
            for item in node.value:
                line = self.line_of(item)
                if not isinstance(item, ScalarNode):
                    self.issue(
                        "CEG008",
                        Severity.ERROR,
                        f"Service {service} has a list entry in environment that is not a string.",
                        "Use entries of the form NAME=value or NAME.",
                        line,
                        service=service,
                    )
                    continue
                name, _sep, _rest = item.value.partition("=")
                if name == "" or not name.strip():
                    self.issue(
                        "CEG008",
                        Severity.ERROR,
                        f"Service {service} has an environment entry with an empty variable name.",
                        "Use entries of the form NAME=value or NAME.",
                        line,
                        service=service,
                    )
                    continue
                if name != name.strip() or not VALID_VARIABLE_NAME.match(name):
                    self.issue(
                        "CEG008",
                        Severity.WARNING,
                        f"Service {service} has an environment entry with an invalid variable name.",
                        "Use letters, digits and underscores, starting with a letter or underscore.",
                        line,
                        service=service,
                    )
                    continue
                self._declare(service, facts, name, line)
            return
        self.issue(
            "CEG005",
            Severity.ERROR,
            f"The environment of service {service} must be a mapping or a list.",
            "Use 'environment:' with either NAME: value pairs or a list of NAME=value entries.",
            self.line_of(node),
            service=service,
        )

    def _declare(self, service: str, facts: ServiceFacts, name: str, line: int) -> None:
        if name in facts.environment:
            self.issue(
                "CEG008",
                Severity.WARNING,
                f"{name} is defined more than once in service {service}; Compose keeps only one value.",
                "Keep a single definition of this variable per service.",
                line,
                variable=name,
                service=service,
            )
            return
        facts.environment[name] = EnvDecl(name=name, line=line)

    def _env_file(self, service: str, facts: ServiceFacts, node: Node) -> None:
        if isinstance(node, ScalarNode) and node.tag == _NULL_TAG:
            return
        entries = node.value if isinstance(node, SequenceNode) else [node]
        for entry in entries:
            line = self.line_of(entry)
            if isinstance(entry, ScalarNode) and entry.tag != _NULL_TAG:
                self._add_env_file(service, facts, entry.value, True, line)
                continue
            if not isinstance(entry, MappingNode):
                self._bad_env_file(service, line)
                continue
            path_nodes: list[Node] = []
            required = True
            valid = True
            for key, _k_node, value in self.pairs(entry):
                if key == "path":
                    if isinstance(value, ScalarNode):
                        path_nodes.append(value)
                    elif isinstance(value, SequenceNode):
                        path_nodes.extend(value.value)
                    else:
                        valid = False
                elif key == "required":
                    text = value.value.lower() if isinstance(value, ScalarNode) else ""
                    if text in _TRUE:
                        required = True
                    elif text in _FALSE:
                        required = False
                    else:
                        valid = False
                elif key == "format":
                    continue
                else:
                    self.issue(
                        "CEG005",
                        Severity.WARNING,
                        f"Unsupported env_file option in service {service}.",
                        "Use only 'path' and 'required' in long-form env_file entries.",
                        line,
                        service=service,
                    )
            if not path_nodes or not valid:
                self._bad_env_file(service, line)
                continue
            for path_node in path_nodes:
                if isinstance(path_node, ScalarNode):
                    self._add_env_file(service, facts, path_node.value, required, self.line_of(path_node))
                else:
                    self._bad_env_file(service, line)

    def _add_env_file(self, service: str, facts: ServiceFacts, path: str, required: bool, line: int) -> None:
        if not path.strip():
            self.issue(
                "CEG005",
                Severity.ERROR,
                f"Service {service} has an empty env_file path.",
                "Give env_file a path relative to the Compose file.",
                line,
                service=service,
            )
            return
        facts.env_files.append(EnvFileEntry(path=path, required=required, line=line))

    def _bad_env_file(self, service: str, line: int) -> None:
        self.issue(
            "CEG005",
            Severity.ERROR,
            f"Service {service} has an env_file entry in an unsupported form.",
            "Use a path string, a list of path strings, or {path: ..., required: ...} entries.",
            line,
            service=service,
        )
