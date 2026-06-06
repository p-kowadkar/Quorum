import os
import sys

# Modules use flat imports (`from models import ...`) and run with brain/ as cwd
# (e.g. `uvicorn app:app`). Put brain/ on the path so tests resolve the same way.
sys.path.insert(0, os.path.dirname(__file__))
