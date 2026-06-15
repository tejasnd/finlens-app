"""Database models."""
from sqlmodel import Field, SQLModel


class Transaction(SQLModel, table=True):
    """A single transaction, mirrored from the React app's data model.

    `date` is stored as an ISO string (the frontend serializes it that way);
    we keep it as text because we only ever group/compare by month here.
    """
    id: str = Field(primary_key=True)
    owner: str = ""
    date: str = ""
    amount: float = 0.0
    description: str = ""
    category: str = "Other"
    split_type: str = "personal"
    source: str = ""
