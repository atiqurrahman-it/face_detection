from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_roles
from ..models import Criminal, Role, Station, User
from ..schemas import DashboardStatsOut, DivisionStatOut, MonthlyTrendOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

TREND_MONTHS = 6


def _last_n_month_keys(n: int) -> list[str]:
    now = datetime.utcnow()
    year, month = now.year, now.month
    keys = []
    for _ in range(n):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            month = 12
            year -= 1
    return list(reversed(keys))


@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.SUPER_ADMIN)),
):
    total_stations = db.query(func.count(Station.id)).scalar()
    total_criminals = db.query(func.count(Criminal.id)).scalar()

    division_rows = (
        db.query(
            Station.division,
            func.count(func.distinct(Station.id)),
            func.count(Criminal.id),
        )
        .outerjoin(Criminal, Criminal.station_id == Station.id)
        .group_by(Station.division)
        .order_by(Station.division)
        .all()
    )
    by_division = [
        DivisionStatOut(division=division, stations=stations, criminals=criminals)
        for division, stations, criminals in division_rows
    ]

    month_keys = _last_n_month_keys(TREND_MONTHS)
    trend_rows = (
        db.query(func.strftime("%Y-%m", Criminal.created_at), func.count(Criminal.id))
        .group_by(func.strftime("%Y-%m", Criminal.created_at))
        .all()
    )
    trend_map = dict(trend_rows)
    criminal_trend = [MonthlyTrendOut(period=key, count=trend_map.get(key, 0)) for key in month_keys]

    return DashboardStatsOut(
        total_stations=total_stations,
        total_criminals=total_criminals,
        by_division=by_division,
        criminal_trend=criminal_trend,
    )
