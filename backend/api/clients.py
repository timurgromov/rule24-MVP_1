from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.deps import get_current_user
from db.session import get_db
from models.client import Client
from models.user import User
from schemas.client import ClientCreateRequest, ClientOut, ClientUpdateRequest

router = APIRouter(prefix="/clients", tags=["clients"])


def _get_owned_client_or_404(
    db: Session,
    user_id: int,
    client_id: int,
    *,
    include_archived: bool = False,
) -> Client:
    query = select(Client).where(Client.id == client_id, Client.user_id == user_id)
    if not include_archived:
        query = query.where(Client.archived_at.is_(None))
    client = db.scalar(query)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    return client


@router.post("", response_model=ClientOut, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientOut:
    client = Client(
        user_id=current_user.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        notes=payload.notes,
        archived_at=None,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return ClientOut.model_validate(client)


@router.get("", response_model=list[ClientOut])
def list_clients(
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClientOut]:
    query = select(Client).where(Client.user_id == current_user.id)
    if not include_archived:
        query = query.where(Client.archived_at.is_(None))
    clients = db.scalars(query.order_by(Client.created_at.desc())).all()
    return [ClientOut.model_validate(client) for client in clients]


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ClientOut:
    client = _get_owned_client_or_404(
        db, current_user.id, client_id, include_archived=True
    )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return ClientOut.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    client = _get_owned_client_or_404(
        db, current_user.id, client_id, include_archived=True
    )
    if client.archived_at is None:
        client.archived_at = datetime.now(timezone.utc)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
