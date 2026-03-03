FROM python:3.11-slim

WORKDIR /app

# Copy LSTM server requirements
COPY DLModelBackend/Server/LSTMServer/requirements.txt .

# Install dependencies
RUN pip install --upgrade pip && \
    pip install --only-binary :all: -r requirements.txt || pip install -r requirements.txt

# Copy LSTM server application and model files
COPY DLModelBackend/Server/LSTMServer/server.py .
COPY DLModelBackend/Server/LSTMServer/*.keras .
COPY DLModelBackend/Server/LSTMServer/*.save .

# Expose port
EXPOSE 5001

# Run with gunicorn
CMD ["gunicorn", "server:app", "--bind", "0.0.0.0:5001"]
