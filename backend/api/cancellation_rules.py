from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.deps import get_current_user
from db.session import get_db
from models.user import User
from schemas.cancellation_rule import CancellationRuleOut, CancellationRuleUpdate
from services.cancellation_rule_service import get_or_create_cancellation_rule

router = APIRouter(prefix="/cancellation-rules", tags=["cancellation-rules"])


@router.get(
    "",
    response_model=CancellationRuleOut,
    summary="Get current user's cancellation rule",
    description="Returns user's rule. If missing, creates default rule with hours_before=24.",
)
def get_cancellation_rule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CancellationRuleOut:
    rule = get_or_create_cancellation_rule(db, current_user.id)
    return CancellationRuleOut.model_validate(rule)


@router.put(
    "",
    response_model=CancellationRuleOut,
    summary="Update cancellation rule",
    description="Updates cancellation window for current user. Penalty amount is legacy.",
)
def update_cancellation_rule(
    payload: CancellationRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CancellationRuleOut:
    rule = get_or_create_cancellation_rule(db, current_user.id)
    rule.hours_before = payload.hours_before
    rule.penalty_amount = payload.penalty_amount

    db.commit()
    db.refresh(rule)
    return CancellationRuleOut.model_validate(rule)
