from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from uuid import uuid4
from datetime import datetime


# ---- Models ----


class TicketCreateRequest(BaseModel):
    """Request payload for creating a new anonymous ticket."""
    summary: str = Field(
        ..., description="Short summary of the issue"
    )
    description: Optional[str] = Field(
        None, description="Detailed description (optional)"
    )


class TicketStatusResponse(BaseModel):
    """Response containing the status of a ticket."""
    ticket_id: str = Field(
        ..., description="Public ticket ID/code for status checks (do NOT expose internals)"
    )
    status: str = Field(
        ..., description="Current ticket status (e.g., 'open', 'closed', etc.)"
    )
    created_at: datetime = Field(
        ..., description="Timestamp when the ticket was created"
    )
    summary: str = Field(
        ..., description="Summary field of the ticket"
    )


class TicketHistoryItem(BaseModel):
    """Minimal information for recent tickets (for history view; no user/personal info)."""
    ticket_id: str = Field(..., description="Public ticket ID")
    status: str = Field(..., description="Ticket status")
    created_at: datetime = Field(..., description="Creation timestamp")


# ---- In-Memory "DB" ----


class Ticket:
    """Internal storage model (not exposed externally)."""

    def __init__(self, summary: str, description: Optional[str]):
        self.ticket_id = str(uuid4())
        self.summary = summary
        self.description = description
        self.status = "open"
        self.created_at = datetime.utcnow()
        self.updates = [
            {"status": "open", "timestamp": self.created_at}
        ]


tickets: Dict[str, Ticket] = {}


# ---- FastAPI Setup ----


openapi_tags = [
    {
        "name": "Tickets",
        "description": "Endpoints for anonymous ticket creation and tracking.",
    },
]


app = FastAPI(
    title="Silent Issue Tracker API",
    description=(
        "An anonymous backend for issue/ticket submission and tracking. "
        "No user-identifying information is stored."
    ),
    version="0.1.0",
    openapi_tags=openapi_tags
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- API Endpoints ----


# PUBLIC_INTERFACE
@app.get("/", summary="Backend Healthcheck", tags=["Tickets"])
def health_check():
    """
    Health check endpoint for the backend.
    """
    return {"message": "Healthy"}


# PUBLIC_INTERFACE
@app.post(
    "/tickets",
    response_model=TicketStatusResponse,
    summary="Submit a new anonymous ticket",
    tags=["Tickets"],
    status_code=201,
    responses={
        201: {"description": "Ticket created successfully."},
        400: {"description": "Invalid request"},
    }
)
def create_ticket(request: TicketCreateRequest):
    """
    Submit a new anonymous ticket.

    - No user-identifying data is stored.
    - Returns a public ticket code for later status checking.
    """
    ticket = Ticket(summary=request.summary, description=request.description)
    tickets[ticket.ticket_id] = ticket
    return TicketStatusResponse(
        ticket_id=ticket.ticket_id,
        status=ticket.status,
        created_at=ticket.created_at,
        summary=ticket.summary,
    )


# PUBLIC_INTERFACE
@app.get(
    "/tickets/{ticket_id}",
    response_model=TicketStatusResponse,
    summary="Get ticket status by public code",
    tags=["Tickets"],
    responses={
        200: {"description": "Ticket status returned."},
        404: {"description": "Ticket not found."},
    }
)
def get_ticket_status(ticket_id: str):
    """
    Retrieve minimal status about a ticket using its public code/ID.
    Only non-identifying info is returned.
    """
    ticket = tickets.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found.")
    return TicketStatusResponse(
        ticket_id=ticket.ticket_id,
        status=ticket.status,
        created_at=ticket.created_at,
        summary=ticket.summary,
    )


# PUBLIC_INTERFACE
@app.get(
    "/ticket-history",
    response_model=List[TicketHistoryItem],
    summary="View minimal ticket history (no user info)",
    tags=["Tickets"],
    responses={
        200: {"description": "Ticket history returned."},
    }
)
def list_ticket_history(limit: int = 20):
    """
    Returns minimal data about the most recent tickets (for history view).
    No identifying/user info is ever returned.
    """
    # Sort by creation date, descending.
    recent_tickets = sorted(
        tickets.values(),
        key=lambda t: t.created_at,
        reverse=True
    )[:limit]
    return [
        TicketHistoryItem(
            ticket_id=t.ticket_id,
            status=t.status,
            created_at=t.created_at
        )
        for t in recent_tickets
    ]
