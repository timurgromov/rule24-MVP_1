from sqlalchemy import select
from sqlalchemy.orm import Session

from models.cancellation_rule import CancellationRule

DEFAULT_CANCELLATION_HOURS = 24


def get_or_create_cancellation_rule(db: Session, user_id: int) -> CancellationRule:
    rule = db.scalar(select(CancellationRule).where(CancellationRule.user_id == user_id))
    if rule is not None:
        return rule

    rule = CancellationRule(user_id=user_id, hours_before=DEFAULT_CANCELLATION_HOURS)
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule
