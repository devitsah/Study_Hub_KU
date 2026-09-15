#!/usr/bin/env bash
# Convenience script: create a venv (first run only), install deps, start Flask.
set -e
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt
python app.py
