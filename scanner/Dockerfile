FROM python:3.11-slim

WORKDIR /app

COPY scanner/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY scanner/ ./scanner/
COPY shared/ ./shared/

ENV PYTHONPATH=/app

WORKDIR /app/scanner

EXPOSE 8002

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
