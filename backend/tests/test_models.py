"""Metadata-only tests: verify the ORM model definitions directly via
SQLAlchemy's metadata/introspection API. These require no database connection
and must pass on any machine, which is why they're the primary test surface
for M1 — see docs/KNOWN_ISSUES.md for why DB-integration tests are separate
and conditionally skipped.
"""

from app.models import Base

EXPECTED_TABLES = {
    "assets",
    "historical_prices",
    "dividends",
    "stock_splits",
    "economic_indicators",
    "economic_indicator_values",
    "users",
    "simulations",
    "audit_logs",
    "ai_explanations",
}


def _table(name: str):
    return Base.metadata.tables[name]


def _column(table_name: str, column_name: str):
    return _table(table_name).columns[column_name]


def test_all_expected_tables_exist() -> None:
    assert EXPECTED_TABLES.issubset(set(Base.metadata.tables.keys()))


def test_all_tables_have_uuid_primary_key() -> None:
    for table_name in EXPECTED_TABLES:
        table = _table(table_name)
        pk_columns = list(table.primary_key.columns)
        assert len(pk_columns) == 1
        assert pk_columns[0].name == "id"


def test_all_tables_have_created_at_timestamptz() -> None:
    for table_name in EXPECTED_TABLES:
        column = _column(table_name, "created_at")
        assert column.nullable is False
        assert column.type.timezone is True


def test_audit_logs_has_no_updated_at_column() -> None:
    # Immutable by convention: audit rows are never modified after creation.
    assert "updated_at" not in _table("audit_logs").columns


def test_all_other_tables_have_updated_at_timestamptz() -> None:
    for table_name in EXPECTED_TABLES - {"audit_logs"}:
        column = _column(table_name, "updated_at")
        assert column.nullable is False
        assert column.type.timezone is True


def test_no_float_or_real_columns_hold_financial_values() -> None:
    forbidden_type_names = {"FLOAT", "REAL", "DOUBLE_PRECISION", "DOUBLE"}
    for table in Base.metadata.tables.values():
        for column in table.columns:
            assert column.type.__class__.__name__.upper() not in forbidden_type_names


def test_historical_prices_unique_constraint() -> None:
    table = _table("historical_prices")
    unique_constraints = [
        c for c in table.constraints if c.__class__.__name__ == "UniqueConstraint"
    ]
    column_sets = [{col.name for col in uc.columns} for uc in unique_constraints]
    assert {"asset_id", "price_date", "data_source"} in column_sets


def test_dividends_unique_constraint() -> None:
    table = _table("dividends")
    unique_constraints = [
        c for c in table.constraints if c.__class__.__name__ == "UniqueConstraint"
    ]
    column_sets = [{col.name for col in uc.columns} for uc in unique_constraints]
    assert {"asset_id", "ex_dividend_date", "dividend_amount"} in column_sets


def test_stock_splits_unique_constraint() -> None:
    table = _table("stock_splits")
    unique_constraints = [
        c for c in table.constraints if c.__class__.__name__ == "UniqueConstraint"
    ]
    column_sets = [{col.name for col in uc.columns} for uc in unique_constraints]
    assert {"asset_id", "split_date"} in column_sets


def test_economic_indicator_values_unique_constraint() -> None:
    table = _table("economic_indicator_values")
    unique_constraints = [
        c for c in table.constraints if c.__class__.__name__ == "UniqueConstraint"
    ]
    column_sets = [{col.name for col in uc.columns} for uc in unique_constraints]
    assert {"indicator_id", "observation_date", "data_source"} in column_sets


def test_economic_indicators_indicator_code_is_unique() -> None:
    column = _column("economic_indicators", "indicator_code")
    assert column.unique or any(
        {"indicator_code"} == {col.name for col in uc.columns}
        for uc in _table("economic_indicators").constraints
        if uc.__class__.__name__ == "UniqueConstraint"
    )


def test_simulations_has_calculation_version_from_migration_one() -> None:
    # Approved fix (ADR-002): must exist now, not deferred.
    column = _column("simulations", "calculation_version")
    assert column.nullable is False
    assert column.server_default is not None


def test_simulations_output_columns_are_nullable() -> None:
    # Approved fix (ADR-003): pending/failed states have no output yet.
    output_columns = [
        "initial_price",
        "final_price",
        "shares_purchased",
        "final_value",
        "total_return_percentage",
        "cagr_percentage",
        "inflation_adjusted_final_value",
    ]
    for name in output_columns:
        assert _column("simulations", name).nullable is True


def test_simulations_input_columns_are_not_nullable() -> None:
    input_columns = ["asset_id", "initial_investment_amount", "start_date", "end_date"]
    for name in input_columns:
        assert _column("simulations", name).nullable is False


def test_ai_explanations_explanation_text_is_nullable() -> None:
    # Approved fix (ADR-003): pending/failed generation_status has no text yet.
    assert _column("ai_explanations", "explanation_text").nullable is True


def test_ai_explanations_simulation_id_is_not_nullable() -> None:
    assert _column("ai_explanations", "simulation_id").nullable is False


def test_users_password_hash_is_nullable_for_oauth() -> None:
    assert _column("users", "password_hash").nullable is True


def test_users_email_is_unique() -> None:
    table = _table("users")
    assert any(
        uc.__class__.__name__ == "UniqueConstraint" and {"email"} == {c.name for c in uc.columns}
        for uc in table.constraints
    )


def test_audit_logs_user_id_has_no_action_on_delete_set_null() -> None:
    fk = next(iter(_column("audit_logs", "user_id").foreign_keys))
    assert fk.ondelete == "SET NULL"


def test_audit_logs_entity_id_has_no_foreign_key() -> None:
    # Documented, intentional exception: entity_type/entity_id is polymorphic.
    assert len(_column("audit_logs", "entity_id").foreign_keys) == 0


def test_foreign_keys_reference_expected_tables() -> None:
    expectations = {
        ("historical_prices", "asset_id"): "assets",
        ("dividends", "asset_id"): "assets",
        ("stock_splits", "asset_id"): "assets",
        ("economic_indicator_values", "indicator_id"): "economic_indicators",
        ("simulations", "asset_id"): "assets",
        ("simulations", "user_id"): "users",
        ("ai_explanations", "simulation_id"): "simulations",
        ("audit_logs", "user_id"): "users",
    }
    for (table_name, column_name), expected_target in expectations.items():
        fk = next(iter(_column(table_name, column_name).foreign_keys))
        assert fk.column.table.name == expected_target


def test_financial_currency_columns_use_numeric_20_8() -> None:
    currency_columns = [
        ("historical_prices", "open_price"),
        ("historical_prices", "high_price"),
        ("historical_prices", "low_price"),
        ("historical_prices", "close_price"),
        ("historical_prices", "adjusted_close_price"),
        ("dividends", "dividend_amount"),
        ("simulations", "initial_investment_amount"),
        ("simulations", "final_value"),
        ("economic_indicator_values", "value"),
    ]
    for table_name, column_name in currency_columns:
        column = _column(table_name, column_name)
        assert column.type.__class__.__name__ == "Numeric"
        assert (column.type.precision, column.type.scale) == (20, 8)


def test_percentage_columns_use_numeric_10_6() -> None:
    percentage_columns = [
        ("simulations", "total_return_percentage"),
        ("simulations", "cagr_percentage"),
        ("stock_splits", "split_ratio"),
    ]
    for table_name, column_name in percentage_columns:
        column = _column(table_name, column_name)
        assert column.type.__class__.__name__ == "Numeric"
        assert (column.type.precision, column.type.scale) == (10, 6)


def test_imported_data_tables_have_data_source_column() -> None:
    tables_requiring_data_source = {
        "assets",
        "historical_prices",
        "dividends",
        "stock_splits",
        "economic_indicators",
        "economic_indicator_values",
    }
    for table_name in tables_requiring_data_source:
        column = _column(table_name, "data_source")
        assert column.nullable is False
