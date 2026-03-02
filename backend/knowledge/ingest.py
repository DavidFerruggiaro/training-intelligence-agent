"""
Knowledge base ingestion pipeline.

Reads sports science research papers (markdown), chunks them into ~500-token
segments with overlap, embeds via sentence-transformers (all-MiniLM-L6-v2),
and stores in a local ChromaDB collection.

Usage:
    python -m knowledge.ingest                # ingest + test query
    python -m knowledge.ingest --ingest-only  # ingest only
    python -m knowledge.ingest --search-only --query "zone 2 training benefits"
"""

from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Any

import chromadb
from sentence_transformers import SentenceTransformer

# ---------------------------------------------------------------------------
# Paths & constants
# ---------------------------------------------------------------------------

_HERE = Path(__file__).resolve().parent
PAPERS_DIR = _HERE / "papers"
CHROMA_DIR = _HERE.parent / "data" / "chroma"
COLLECTION_NAME = "sports_science_papers"

# ---------------------------------------------------------------------------
# Topic tag mapping  (filename prefix → semantic tags)
# ---------------------------------------------------------------------------

_PREFIX_TAGS: dict[str, list[str]] = {
    "hrv": ["hrv", "heart-rate-variability", "recovery-monitoring"],
    "polarized": ["polarized-training", "intensity-distribution"],
    "sleep": ["sleep", "recovery", "athletic-performance"],
    "overtraining": ["overtraining", "biomarkers", "fatigue"],
    "periodization": ["periodization", "training-programming"],
    "deload": ["deload", "recovery", "supercompensation"],
    "zone2": ["zone-2", "aerobic-base", "endurance"],
    "recovery": ["recovery", "post-exercise", "modalities"],
    "acwr": ["acwr", "training-load", "injury-prevention"],
    "training_load": ["training-load", "monitoring", "workload"],
    "heat": ["heat-acclimation", "thermoregulation", "environmental"],
    "altitude": ["altitude-training", "hypoxia", "erythropoiesis"],
}


def _infer_topic_tags(filename: str) -> list[str]:
    """Derive topic tags from the paper's filename prefix."""
    stem = Path(filename).stem.lower()
    for prefix, tags in _PREFIX_TAGS.items():
        if stem.startswith(prefix):
            return tags
    return ["general"]


# ---------------------------------------------------------------------------
# Markdown metadata extraction
# ---------------------------------------------------------------------------

def _parse_metadata(text: str) -> dict[str, str]:
    """Pull title, authors, and year out of a paper's markdown front-matter."""
    title = authors = year = ""

    for line in text.splitlines():
        stripped = line.strip()
        if not title and stripped.startswith("# "):
            title = stripped.lstrip("# ").strip()
        elif stripped.startswith("- **Authors**:"):
            authors = stripped.split(":", 1)[1].strip()
        elif stripped.startswith("- **Year**:"):
            year = stripped.split(":", 1)[1].strip()

    return {"title": title, "authors": authors, "year": year}


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------

def _estimate_tokens(text: str) -> int:
    """Rough token count (~1.3 tokens per whitespace-delimited word)."""
    return int(len(text.split()) * 1.3)


def _chunk_text(
    text: str,
    max_tokens: int = 500,
    overlap_tokens: int = 50,
) -> list[str]:
    """
    Split *text* into chunks of approximately *max_tokens* with
    *overlap_tokens* of trailing context carried into the next chunk.
    Splits on sentence boundaries to avoid cutting mid-sentence.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())

    chunks: list[str] = []
    current: list[str] = []
    current_tok = 0

    for sentence in sentences:
        stok = _estimate_tokens(sentence)

        # If adding this sentence would overflow, flush the chunk.
        if current_tok + stok > max_tokens and current:
            chunks.append(" ".join(current))

            # Build overlap from the tail of the current chunk.
            overlap: list[str] = []
            overlap_tok = 0
            for s in reversed(current):
                t = _estimate_tokens(s)
                if overlap_tok + t > overlap_tokens:
                    break
                overlap.insert(0, s)
                overlap_tok += t

            current = overlap
            current_tok = overlap_tok

        current.append(sentence)
        current_tok += stok

    if current:
        chunks.append(" ".join(current))

    return chunks


# ---------------------------------------------------------------------------
# Deterministic chunk IDs
# ---------------------------------------------------------------------------

def _chunk_id(filename: str, index: int, text: str) -> str:
    content_hash = hashlib.md5(text.encode()).hexdigest()[:8]
    return f"{Path(filename).stem}__chunk{index}__{content_hash}"


# ---------------------------------------------------------------------------
# Embedding model (lazy singleton)
# ---------------------------------------------------------------------------

_model_cache: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model_cache
    if _model_cache is None:
        _model_cache = SentenceTransformer("all-MiniLM-L6-v2")
    return _model_cache


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------

def ingest(
    papers_dir: Path | str | None = None,
    chroma_dir: Path | str | None = None,
) -> int:
    """
    Read every ``*.md`` file in *papers_dir*, chunk it, embed it, and upsert
    into a ChromaDB collection.  Returns the total number of chunks stored.
    """
    papers_dir = Path(papers_dir or PAPERS_DIR)
    chroma_dir = Path(chroma_dir or CHROMA_DIR)

    md_files = sorted(papers_dir.glob("*.md"))
    if not md_files:
        print(f"No markdown files found in {papers_dir}")
        return 0

    print(f"Found {len(md_files)} papers in {papers_dir}")

    model = _get_model()
    print(f"Embedding model loaded: {model.get_sentence_embedding_dimension()}d")

    # Prepare ChromaDB (clean re-ingest each run)
    chroma_dir.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_dir))
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass  # Collection doesn't exist yet — that's fine
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    all_ids: list[str] = []
    all_docs: list[str] = []
    all_embeds: list[list[float]] = []
    all_metas: list[dict[str, Any]] = []

    for md_file in md_files:
        text = md_file.read_text(encoding="utf-8")
        meta = _parse_metadata(text)
        tags = _infer_topic_tags(md_file.name)
        chunks = _chunk_text(text)

        print(f"  {md_file.name}: {len(chunks)} chunks")

        embeddings = model.encode(chunks).tolist()

        for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            all_ids.append(_chunk_id(md_file.name, i, chunk))
            all_docs.append(chunk)
            all_embeds.append(emb)
            all_metas.append({
                "paper_title": meta["title"],
                "authors": meta["authors"],
                "year": meta["year"],
                "topic_tags": ",".join(tags),
                "source_file": md_file.name,
                "chunk_index": i,
            })

    # Batch upsert (ChromaDB handles batching internally)
    collection.add(
        ids=all_ids,
        documents=all_docs,
        embeddings=all_embeds,
        metadatas=all_metas,
    )

    print(f"\nIngested {len(all_ids)} chunks from {len(md_files)} papers "
          f"into collection '{COLLECTION_NAME}'")
    return len(all_ids)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search_papers(
    query: str,
    n_results: int = 5,
    chroma_dir: Path | str | None = None,
) -> list[dict[str, Any]]:
    """
    Semantic search over ingested paper chunks.

    Returns a list of dicts, each with keys ``text``, ``metadata``, and
    ``distance`` (cosine distance — lower is more similar).
    """
    chroma_dir = Path(chroma_dir or CHROMA_DIR)
    client = chromadb.PersistentClient(path=str(chroma_dir))
    collection = client.get_collection(COLLECTION_NAME)

    model = _get_model()
    query_embedding = model.encode(query).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    output: list[dict[str, Any]] = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        output.append({
            "text": doc,
            "metadata": meta,
            "distance": round(dist, 4),
        })
    return output


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Ingest sports-science papers into ChromaDB and run a test search.",
    )
    parser.add_argument(
        "--ingest-only", action="store_true",
        help="Run ingestion only, skip the test query.",
    )
    parser.add_argument(
        "--search-only", action="store_true",
        help="Skip ingestion, only run a search.",
    )
    parser.add_argument(
        "--query", type=str,
        default="How does HRV guide training intensity decisions?",
        help="Natural-language query for the test search.",
    )
    parser.add_argument(
        "--n-results", type=int, default=5,
        help="Number of results to return.",
    )
    args = parser.parse_args()

    if not args.search_only:
        print("=" * 60)
        print("INGESTION")
        print("=" * 60)
        ingest()
        print()

    if not args.ingest_only:
        print("=" * 60)
        print(f"SEARCH: \"{args.query}\"")
        print("=" * 60)
        results = search_papers(args.query, n_results=args.n_results)
        for i, r in enumerate(results, 1):
            m = r["metadata"]
            print(f"\n--- Result {i} (distance: {r['distance']}) ---")
            print(f"Paper:   {m['paper_title']}")
            print(f"Authors: {m['authors']}")
            print(f"Year:    {m['year']}")
            print(f"Tags:    {m['topic_tags']}")
            snippet = r["text"][:300].replace("\n", " ")
            print(f"Chunk:   {snippet}...")


if __name__ == "__main__":
    main()
