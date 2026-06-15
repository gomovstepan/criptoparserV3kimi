FROM python:3.11-slim

WORKDIR /app

COPY collector/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY collector/ ./collector/
COPY shared/ ./shared/

ENV PYTHONPATH=/app

WORKDIR /app/collector

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
