import numpy as np
import pandas as pd


def build_feature_row(
    historical_values,
    cumulative_values,
    county_encoded,
    months_since_start,
    year,
    month,
):
    """
    Build a single-row feature DataFrame matching training-time features.
    """

    lag1, lag2, lag3 = (
        historical_values[-1],
        historical_values[-2],
        historical_values[-3],
    )

    roll_mean_3 = np.mean([lag1, lag2, lag3])

    pct_change_1 = (lag1 - lag2) / lag2 if lag2 != 0 else 0
    pct_change_3 = (lag1 - lag3) / lag3 if lag3 != 0 else 0

    ev_growth_slope = (
        np.polyfit(range(len(cumulative_values)), cumulative_values, 1)[0]
        if len(cumulative_values) >= 3
        else 0
    )

    return pd.DataFrame([{
        "months_since_start": months_since_start,
        "year": year,
        "month": month,
        "county_encoded": county_encoded,
        "ev_total_lag1": lag1,
        "ev_total_lag2": lag2,
        "ev_total_lag3": lag3,
        "ev_total_roll_mean_3": roll_mean_3,
        "ev_total_pct_change_1": pct_change_1,
        "ev_total_pct_change_3": pct_change_3,
        "ev_growth_slope": ev_growth_slope,
    }])

    return feature_row
