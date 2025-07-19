FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OLLAMA_HOST=http://ollama:11434 \
    DJANGO_SETTINGS_MODULE=Chatbot.settings

# Install dependencies
RUN apt-get update && apt-get install -y gcc libffi-dev libssl-dev && rm -rf /var/lib/apt/lists/*


WORKDIR /Chatbot

# Correctly copy the requirements.txt
COPY requirements.txt /Chatbot/

# Install Python deps
RUN pip install --upgrade pip && pip install --prefer-binary -r requirements.txt

# Copy full backend project (assumes you're building from KU_Chatbot root)
COPY . /Chatbot/

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
