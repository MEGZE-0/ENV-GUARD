"""Safe YAML loading with limits before recursive construction or alias expansion."""

from typing import ClassVar

import yaml
from yaml.nodes import MappingNode, Node, SequenceNode


class BoundedSafeLoader(yaml.SafeLoader):
    """Bound depth and alias visits while PyYAML composes its node graph."""

    MAX_DEPTH: ClassVar[int] = 64
    MAX_NODES: ClassVar[int] = 10_000

    def __init__(self, stream: str) -> None:
        super().__init__(stream)
        self._depth = 0
        self._visits = 0

    def compose_node(self, parent: Node | None, index: Node | int | None) -> Node:
        self._visits += 1
        if self._depth >= self.MAX_DEPTH or self._visits > self.MAX_NODES:
            raise yaml.YAMLError("YAML complexity limit exceeded")
        self._depth += 1
        try:
            return super().compose_node(parent, index)
        finally:
            self._depth -= 1

    def get_single_data(self) -> object:
        node = self.get_single_node()
        if node is None:
            return None
        # Count expanded visits, rather than unique nodes: a small alias graph can
        # otherwise expand exponentially in SafeConstructor.flatten_mapping.
        stack = [(node, ())]
        visits = 0
        while stack:
            current, ancestors = stack.pop()
            visits += 1
            if visits > self.MAX_NODES or id(current) in ancestors or len(ancestors) >= self.MAX_DEPTH:
                raise yaml.YAMLError("YAML recursion or complexity limit exceeded")
            ancestors = (*ancestors, id(current))
            if isinstance(current, MappingNode):
                stack.extend((child, ancestors) for pair in current.value for child in pair)
            elif isinstance(current, SequenceNode):
                stack.extend((child, ancestors) for child in current.value)
        return self.construct_document(node)
