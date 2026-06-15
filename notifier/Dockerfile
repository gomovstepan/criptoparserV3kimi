FROM python:3.11-slim

WORKDIR /app

COPY notifier/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY notifier/ ./notifier/
COPY shared/ ./shared/

ENV PYTHONPATH=/app

WORKDIR /app/notifier

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]
