FROM python

WORKDIR /app
COPY . /app/

RUN pip install -r requirements.txt


CMD ["uvicorn", "main:app", "--port", "5000", "--host", "0.0.0.0"]