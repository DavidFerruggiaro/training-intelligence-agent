#!/usr/bin/env bash
# Build script for Render (and similar platforms).
# Installs Python dependencies and populates the ChromaDB vector store
# from the sports science research papers in knowledge/papers/.
set -e

pip install -r requirements.txt

cd knowledge
python ingest.py
