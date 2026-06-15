"""RAG core: local embeddings + an in-memory vector index.

Embeddings run on-device via sentence-transformers (all-MiniLM-L6-v2) — no API
call, so financial data never leaves the machine. For a few thousand
transactions a brute-force cosine search over a normalized matrix is well under
a millisecond, so we deliberately avoid pulling in a vector database.
"""
import threading

import numpy as np

_model = None
_model_lock = threading.Lock()


def _get_model():
    """Lazy-load the embedding model (first call downloads ~80 MB, then cached)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def embed(texts: list[str]) -> np.ndarray:
    """Return L2-normalized embeddings so a dot product equals cosine similarity."""
    return _get_model().encode(
        texts, normalize_embeddings=True, convert_to_numpy=True
    )


class VectorIndex:
    """In-memory index of (id, embedding). Rebuilt from SQLite on each /index."""

    def __init__(self):
        self.ids: list[str] = []
        self.matrix: np.ndarray | None = None

    def build(self, ids: list[str], texts: list[str]) -> None:
        self.ids = list(ids)
        self.matrix = embed(texts) if texts else None

    def is_empty(self) -> bool:
        return self.matrix is None or not self.ids

    def search(self, query: str, k: int = 20) -> list[tuple[str, float]]:
        if self.is_empty():
            return []
        q = embed([query])[0]
        sims = self.matrix @ q  # cosine, since rows + query are normalized
        k = min(k, len(self.ids))
        # Partial top-k then sort just those — avoids a full sort of all rows.
        top = np.argpartition(-sims, k - 1)[:k]
        top = top[np.argsort(-sims[top])]
        return [(self.ids[i], float(sims[i])) for i in top]


index = VectorIndex()
