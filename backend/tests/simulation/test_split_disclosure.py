"""Stock split disclosure tests (Founder Decision 001 / KI-016).

IMPORTANT SCOPE NOTE — read before trusting this file as full verification:

These tests verify that OUR CODE treats `stock_splits` as audit/disclosure
data only, never as a share-count math input, GIVEN synthetic price data
constructed to already look split-consistent (i.e. as if freshly re-fetched
after the split, per the vendor convention described in
`docs/simulation_formulas.md` §3).

They do NOT verify the underlying empirical claim itself — that yfinance's
real, live `close_price` data is actually already split-adjusted this way.
No network access was available in the environment that authored this
milestone, so that claim remains unverified against live data. See
`docs/KNOWN_ISSUES.md` KI-016 for the manual verification runbook required
before this design is treated as fully closed for production use.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.models import StockSplit
from app.simulation.engine import run_simulation
from tests.simulation.conftest import make_asset, make_price

pytestmark = pytest.mark.integration


def test_disclosed_splits_includes_split_events_in_range(db_session) -> None:
    asset = make_asset(db_session, "SPLIT1")
    make_price(db_session, asset, date(2020, 1, 1), "400")
    make_price(db_session, asset, date(2020, 12, 1), "120")
    split = StockSplit(
        asset_id=asset.id,
        split_date=date(2020, 6, 1),
        split_ratio=Decimal("4"),
        data_source="manual_import",
    )
    db_session.add(split)
    db_session.flush()

    outcome = run_simulation(
        db_session,
        symbol="SPLIT1",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 1),
    )

    assert len(outcome.disclosed_splits) == 1
    assert outcome.disclosed_splits[0].split_date == date(2020, 6, 1)
    assert outcome.disclosed_splits[0].split_ratio == Decimal("4.000000")


def test_split_ratio_never_multiplies_share_count(db_session) -> None:
    """Given already-split-consistent close_price data spanning a 4-for-1
    split (pre-split price already looks like $100, matching what a fresh
    fetch would show today — see module docstring), the engine must compute
    shares purely from close_price at start/end, with NO extra x4 or /4
    factor applied anywhere because of the recorded split_ratio."""
    asset = make_asset(db_session, "SPLIT2")
    # Pretend this is what a fresh fetch shows for both dates today, after
    # the platform's data provider already retroactively adjusted for the
    # split that occurred in between.
    make_price(db_session, asset, date(2020, 1, 1), "100")  # pre-split, already-adjusted view
    make_price(db_session, asset, date(2020, 12, 1), "120")  # post-split
    db_session.add(
        StockSplit(
            asset_id=asset.id,
            split_date=date(2020, 6, 1),
            split_ratio=Decimal("4"),
            data_source="manual_import",
        )
    )
    db_session.flush()

    outcome = run_simulation(
        db_session,
        symbol="SPLIT2",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 1),
    )
    sim = outcome.simulation

    # If the engine incorrectly multiplied shares by split_ratio (4), shares
    # would be 40 and final_value would be 4800 -- both wrong.
    assert sim.shares_purchased == Decimal("10.00000000")
    assert sim.final_value == Decimal("1200.00000000")


def test_simulation_with_no_splits_in_range_has_empty_disclosure(db_session) -> None:
    asset = make_asset(db_session, "SPLIT3")
    make_price(db_session, asset, date(2020, 1, 1), "100")
    make_price(db_session, asset, date(2020, 12, 1), "110")

    outcome = run_simulation(
        db_session,
        symbol="SPLIT3",
        investment_amount=Decimal("1000"),
        start_date=date(2020, 1, 1),
        end_date=date(2020, 12, 1),
    )

    assert outcome.disclosed_splits == ()
