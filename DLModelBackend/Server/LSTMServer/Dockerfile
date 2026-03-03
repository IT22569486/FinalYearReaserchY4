FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --upgrade pip && \
    pip install --only-binary :all: -r requirements.txt || pip install -r requirements.txt

# Copy application files
COPY server.py .
COPY *.keras .
COPY *.save .

# Expose port
EXPOSE 5001

# Run with gunicorn
CMD ["gunicorn", "server:app", "--bind", "0.0.0.0:5001"]
