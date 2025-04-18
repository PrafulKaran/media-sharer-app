# backend/run.py
from app import create_app
import os

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    print(f"Starting Flask app on port {port} with debug mode: {debug_mode}")
    # Use host='0.0.0.0' if needed, otherwise default is 127.0.0.1
    app.run(debug=debug_mode, port=port, host='0.0.0.0')