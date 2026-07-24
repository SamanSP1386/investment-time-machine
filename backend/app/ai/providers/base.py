"""AI Provider Layer contract — mirrors `app/ingestion/providers/base.py`'s
Protocol-based abstraction (ADR-013 precedent), applied here to satisfy
Founder Specification Part 2.7.15 (provider-independence via an abstraction
layer, not a direct vendor dependency).

A provider adapter's only job is talking to one vendor's API. It has no
knowledge of prompts, safety checks, caching, or persistence, and it never
sees a `Simulation`, a `User`, or a database session — every input it
receives is already a fully-built string (Founder Specification Part 2.7.7:
AI must never have raw DB/infra access; Part 2.7.16: AI services must never
access production secrets or execute administrative actions).
"""

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class ProviderResult:
    text: str
    model_name: str  # the exact model identifier the vendor actually used


@runtime_checkable
class AIProvider(Protocol):
    name: str  # e.g. "groq", "none" — matches ai_explanations.model_name's provider family

    def generate(
        self, *, system_prompt: str, user_content: str, max_tokens: int
    ) -> ProviderResult: ...
