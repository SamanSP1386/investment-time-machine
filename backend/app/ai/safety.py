"""Post-generation safety gates (Founder Specification Part 2.7.9
Hallucination Prevention Strategy, Part 2.7.5 Prohibited Behaviors, M6 design
review section 7/19). Every AI response — initial explanation or follow-up
answer — must pass every applicable check here before it is ever persisted
with a COMPLETED status or shown to a user. A failure is not a soft warning:
`app.ai.service` rejects the generation outright (reject, don't sanitize).

These are pure, deterministic, network-free functions — trivially unit
testable without a live provider.
"""

import re
from dataclasses import dataclass, field
from decimal import Decimal

REQUIRED_EXPLANATION_SECTIONS = (
    "Summary",
    "What Happened",
    "Why It Happened",
    "Financial Concepts",
    "Key Takeaways",
    "Limitations",
)

# Small integers below this bound are treated as structural/counting
# language ("three reasons", "two key concepts", "12 months") rather than
# financial facts — a documented heuristic tradeoff (M6 design review §7):
# without it, ordinary prose numbering would trigger constant false-positive
# integrity failures. Anything at or above this bound must trace back to
# `simulation_facts` exactly like every other number.
_SMALL_COUNTING_NUMBER_MAX = 12

_NUMBER_PATTERN = re.compile(r"-?\$?\d[\d,]*(?:\.\d+)?%?")

# Best-effort, not exhaustive: catches the literal prohibited-behavior
# examples in Founder Specification Part 2.7.5 ("Buy NVIDIA.", "Sell Tesla.",
# "Invest in Bitcoin.") and their common paraphrases. A residual risk exists
# for advice phrased in a way none of these patterns catch — documented as a
# known limitation in the M6 AI safety review, not silently assumed solved.
_ADVICE_PATTERNS = [
    re.compile(pattern, re.IGNORECASE)
    for pattern in [
        r"\byou should (buy|sell|hold|invest|short)\b",
        r"\bi (recommend|advise)\b",
        r"\bi suggest (buying|selling|investing|holding)\b",
        r"\bconsider (buying|selling|shorting)\b",
        r"\b(buy|sell|invest in) (this|it) (now|today|immediately)\b",
        r"\bnow is a good time to (buy|sell|invest)\b",
        r"\bthis (stock|asset|crypto|coin) will\b",
        r"\bguaranteed (return|profit|gain)s?\b",
    ]
]


@dataclass(frozen=True)
class StructureResult:
    is_valid: bool
    missing_sections: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class IntegrityResult:
    is_valid: bool
    offending_values: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class AdviceLanguageResult:
    is_valid: bool
    matched_phrases: list[str] = field(default_factory=list)


def check_output_structure(text: str) -> StructureResult:
    """Verifies the six model-generated sections are present as `## <Name>`
    headers (Educational Disclaimer is excluded — see module docstring)."""
    missing = [section for section in REQUIRED_EXPLANATION_SECTIONS if f"## {section}" not in text]
    return StructureResult(is_valid=not missing, missing_sections=missing)


def _numeric_leaves(value: object) -> list[float]:
    """Walks a JSON-like structure (dict/list/scalar) and collects every
    value that represents a number, including numeric strings (dates like
    "2020-01-02" fail float() and are silently skipped — years are supplied
    to the AI as separate plain-int fields for exactly this reason, see
    `app.api.v1.services.explanation_service._build_simulation_facts`)."""
    leaves: list[float] = []
    if value is None or isinstance(value, bool):
        return leaves
    if isinstance(value, int | float | Decimal):
        leaves.append(round(float(value), 6))
    elif isinstance(value, str):
        try:
            leaves.append(round(float(value.replace(",", "")), 6))
        except ValueError:
            pass
    elif isinstance(value, dict):
        for item in value.values():
            leaves.extend(_numeric_leaves(item))
    elif isinstance(value, list | tuple):
        for item in value:
            leaves.extend(_numeric_leaves(item))
    return leaves


def _extract_allowed_values(simulation_facts: dict) -> set[float]:
    allowed = set(_numeric_leaves(simulation_facts))
    allowed.update(float(n) for n in range(_SMALL_COUNTING_NUMBER_MAX + 1))
    return allowed


def _parse_number_token(token: str) -> float:
    cleaned = token.replace("$", "").replace(",", "").rstrip("%")
    return float(cleaned)


def _is_allowed(value: float, allowed: set[float]) -> bool:
    # 1% relative tolerance with a small absolute floor — covers a model
    # rounding "9.596872" to "9.6" or "$1,199.999..." to "$1,200" without
    # opening the door to a genuinely fabricated figure (M6 design review §7).
    tolerance = max(0.05, abs(value) * 0.01)
    return any(abs(value - candidate) <= tolerance for candidate in allowed)


def check_numeric_integrity(text: str, simulation_facts: dict) -> IntegrityResult:
    """Founder Specification Part 2.7.9 Rules 1/3: every number in the
    narrative must trace back to `simulation_facts`. Known, documented
    limitation: numbers spelled out in words (e.g. "twelve hundred dollars")
    or abbreviated ("$1.2K") are not extracted and so cannot be checked —
    the prompt itself instructs the model to use figures verbatim from the
    provided data, which in practice avoids both forms."""
    allowed = _extract_allowed_values(simulation_facts)
    offending = []
    for match in _NUMBER_PATTERN.finditer(text):
        token = match.group()
        try:
            value = _parse_number_token(token)
        except ValueError:
            continue
        if not _is_allowed(value, allowed):
            offending.append(token)
    return IntegrityResult(is_valid=not offending, offending_values=offending)


def check_advice_language(text: str) -> AdviceLanguageResult:
    """Founder Specification Part 2.7.5: "Provide Investment Advice" is a
    named prohibited behavior. Best-effort pattern match, not exhaustive —
    see module docstring."""
    matched = []
    for pattern in _ADVICE_PATTERNS:
        match = pattern.search(text)
        if match:
            matched.append(match.group())
    return AdviceLanguageResult(is_valid=not matched, matched_phrases=matched)
