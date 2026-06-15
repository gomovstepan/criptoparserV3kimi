FROM python:3.11-slim

WORKDIR /app

COPY executor/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY executor/ ./executor/
COPY shared/ ./shared/

ENV PYTHONPATH=/app

WORKDIR /app/executor

EXPOSE 8003

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
