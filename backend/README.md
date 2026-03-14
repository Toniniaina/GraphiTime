# GraphiTime Backend

## Run

```bash
python -m venv .venv
# Windows
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Endpoints

- `GET /health`
- `POST/GET /graphql`
