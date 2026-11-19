# AI recommendation service

This FastAPI service trains a `RandomForestRegressor` from the ratings in
`data/dataset_turismo_bogota_50k_rating.xlsx` when it starts. It does not use a
database; the trained model stays in memory. The dataset is bundled with this
service so it can also run on Render.

## Run locally on Windows

From this directory, create a fresh environment (the downloaded virtual
environments may point to a different computer):

```powershell
py -3.13 -m venv .venv-local
.\.venv-local\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-local\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

The service is available at `http://127.0.0.1:8000`. Open
`http://127.0.0.1:8000/docs` to inspect its API. Keep the process running while
using the Expo trip planner.

The Render deployment is declared in the repository's `render.yaml`. Set
`VITE_AI_SERVICE_URL` in the Vercel frontend to the public ML service URL.

The request uses the dataset's own travel-type, companion, and budget categories.
The Expo planner sends only the budget; when no companion is supplied, the
service averages the four companion scenarios instead of assuming one. The
predicted rating is a model estimate, not a live or guaranteed rating.
