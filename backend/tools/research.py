"""Research search tool.

Wraps the ChromaDB semantic search from knowledge/ingest.py and returns
formatted research findings with citations for the agent.
"""

from __future__ import annotations

from typing import Any


def search_research(
    query: str,
    n_results: int = 5,
) -> dict[str, Any]:
    """Search the sports science knowledge base.

    Parameters
    ----------
    query : str
        Natural-language research question (e.g. "HRV-guided training
        for endurance athletes").
    n_results : int
        Maximum number of results to return (default 5).

    Returns
    -------
    dict with keys: query, num_results, findings (list of formatted
    research excerpts with full citation metadata).
    """
    if not query or not query.strip():
        return {"error": "Query string is required."}

    try:
        from knowledge.ingest import search_papers  # lazy: defers ChromaDB + SentenceTransformer load
        raw_results = search_papers(query, n_results=n_results)
    except Exception as e:
        return {
            "error": f"Search failed: {e}. Has the knowledge base been ingested? "
                     "Run: python -m knowledge.ingest",
        }

    findings: list[dict[str, Any]] = []
    for i, result in enumerate(raw_results, 1):
        meta = result["metadata"]
        # Build a citation string
        authors = meta.get("authors", "Unknown")
        year = meta.get("year", "n.d.")
        title = meta.get("paper_title", "Untitled")
        citation = f"{authors} ({year}). {title}."

        findings.append({
            "rank": i,
            "citation": citation,
            "source_file": meta.get("source_file", ""),
            "topic_tags": meta.get("topic_tags", "").split(","),
            "relevance_score": round(1 - result["distance"], 4),
            "excerpt": result["text"],
        })

    return {
        "query": query,
        "num_results": len(findings),
        "findings": findings,
    }
