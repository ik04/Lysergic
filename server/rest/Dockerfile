FROM python:3.12-slim

WORKDIR /app
COPY . /app/

RUN pip install -r requirements.txt && \
    pip install playwright && \
    playwright install chromium && \
    playwright install-deps chromium

CMD ["uvicorn", "main:app", "--port", "5000", "--host", "0.0.0.0"]
