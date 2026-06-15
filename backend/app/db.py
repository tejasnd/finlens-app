"""SQLite persistence (via SQLModel). The DB file lives next to the backend."""
from collections.abc import Iterator

from sqlmodel import Session, SQLModel, create_engine

engine = create_engine(
    "sqlite:///finlens.db", connect_args={"check_same_thread": False}
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
