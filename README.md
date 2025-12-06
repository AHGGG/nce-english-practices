# NCE English Practice (Web App)

An interactive English tense practice application powered by LLMs (DeepSeek/OpenAI). 
Built with FastAPI and Vanilla JS, featuring a premium glassmorphism UI.

## Features

- **AI-Powered Vocabulary**: Generates context-aware vocabulary based on your chosen topic.
- **Tense Matrix**: Automatically generates sentences across 4 time layers and 4 aspects.
- **Interactive Practice**: (Coming soon) Type your answers and get AI feedback.
- **Smart Caching**: Caches generated content to save API costs.

## Setup

1. **Install Dependencies**:
   ```bash
   uv sync
   # OR
   pip install -r requirements.txt
   ```
   *Note: Requires Python 3.11+*

2. **Configuration**:
   Create a `.env` file:
   ```env
   DEEPSEEK_API_KEY=your_key
   DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
   MODEL_NAME=deepseek-chat
   ```

3. **Run the Server**:
   ```bash
   uvicorn app:app --reload
   ```

4. **Open Browser**:
   Navigate to `http://127.0.0.1:8000`

## Project Structure

- `app.py`: FastAPI backend
- `theme_vocab.py`: Vocabulary generation logic
- `sentence_generator.py`: Sentence generation logic
- `static/`: CSS and JS assets
- `templates/`: HTML templates
