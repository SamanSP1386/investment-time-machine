"""Unit tests for `app.ai.safety` — the numeric-integrity, output-structure,
and advice-language gates that enforce Founder Specification Part 2.7.9
(Hallucination Prevention) and Part 2.7.5 (Prohibited Behaviors). Pure,
network-free, deterministic.
"""

from app.ai.safety import (
    REQUIRED_EXPLANATION_SECTIONS,
    check_advice_language,
    check_numeric_integrity,
    check_output_structure,
)

SAMPLE_FACTS = {
    "asset_symbol": "AAPL",
    "investment_amount": "1000.00000000",
    "start_year": 2015,
    "end_year": 2025,
    "duration_years": 10.0,
    "final_value": "2500.00000000",
    "total_return_percentage": "150.000000",
    "cagr_percentage": "9.596872",
}


def _full_structured_text(body: str = "") -> str:
    sections = "\n\n".join(
        f"## {name}\nSome text about {name}. {body}" for name in REQUIRED_EXPLANATION_SECTIONS
    )
    return sections


class TestCheckOutputStructure:
    def test_all_sections_present_is_valid(self):
        result = check_output_structure(_full_structured_text())
        assert result.is_valid is True
        assert result.missing_sections == []

    def test_missing_section_is_invalid(self):
        text = "## Summary\nHello\n\n## What Happened\nStuff happened."
        result = check_output_structure(text)
        assert result.is_valid is False
        assert "Financial Concepts" in result.missing_sections
        assert "Why It Happened" in result.missing_sections

    def test_disclaimer_is_not_required_by_this_check(self):
        # Disclaimer is appended by code (app.ai.service), never expected
        # from the model — omitting it here must not fail this check.
        text = _full_structured_text()
        assert "Educational Disclaimer" not in text
        assert check_output_structure(text).is_valid is True


class TestCheckNumericIntegrity:
    def test_numbers_matching_simulation_facts_are_valid(self):
        text = (
            "You invested $1000 in AAPL from 2015 to 2025. "
            "Your final value was $2500, a total return of 150%. "
            "Your CAGR was approximately 9.6%."
        )
        result = check_numeric_integrity(text, SAMPLE_FACTS)
        assert result.is_valid is True, result.offending_values

    def test_fabricated_dollar_amount_is_rejected(self):
        text = "Your investment would have grown to $9,999,999 — an incredible result!"
        result = check_numeric_integrity(text, SAMPLE_FACTS)
        assert result.is_valid is False
        assert any("9,999,999" in v for v in result.offending_values)

    def test_fabricated_percentage_is_rejected(self):
        text = "This represents an amazing 845% return on your money."
        result = check_numeric_integrity(text, SAMPLE_FACTS)
        assert result.is_valid is False
        assert any("845" in v for v in result.offending_values)

    def test_small_counting_numbers_are_allowed(self):
        # "three factors", "two concepts" written as digits should not be
        # treated as fabricated financial facts (M6 design review §7).
        text = "There are 3 key factors and 2 important concepts to understand here."
        result = check_numeric_integrity(text, SAMPLE_FACTS)
        assert result.is_valid is True, result.offending_values

    def test_rounded_figure_within_tolerance_is_allowed(self):
        # 9.596872 rounded to 9.6 must not be flagged as fabricated.
        text = "Your CAGR was 9.6% over the period."
        result = check_numeric_integrity(text, SAMPLE_FACTS)
        assert result.is_valid is True, result.offending_values

    def test_unrelated_named_entity_number_is_rejected(self):
        # No comparison data was ever provided to the model — a benchmark
        # figure it invents anyway must be caught, even if it looks like a
        # named entity ("the S&P 500").
        text = "This significantly outperformed the S&P 500, which only returned 62% here."
        result = check_numeric_integrity(text, SAMPLE_FACTS)
        assert result.is_valid is False


class TestCheckAdviceLanguage:
    def test_neutral_educational_text_is_valid(self):
        text = "CAGR stands for Compound Annual Growth Rate and annualizes returns over time."
        result = check_advice_language(text)
        assert result.is_valid is True

    def test_direct_buy_recommendation_is_rejected(self):
        result = check_advice_language("You should buy more shares while the price is low.")
        assert result.is_valid is False
        assert result.matched_phrases

    def test_i_recommend_phrase_is_rejected(self):
        result = check_advice_language("I recommend increasing your position given these results.")
        assert result.is_valid is False

    def test_guaranteed_return_claim_is_rejected(self):
        result = check_advice_language("This strategy offers a guaranteed return every year.")
        assert result.is_valid is False
