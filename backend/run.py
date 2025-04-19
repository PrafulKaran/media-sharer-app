# backend/run.py
from app import create_app # Import the factory function
import os

# Create the Flask app instance using the factory
# This 'app' variable is what Gunicorn will look for via "run:create_app()"
app = create_app()

# This block only runs when executing "python run.py" directly (local dev)
if __name__ == '__main__':
    # Read PORT and DEBUG settings from environment for local running
    port = int(os.environ.get('PORT', 5000))
    # app.config['DEBUG'] is set inside create_app now
    debug_mode = app.config.get('DEBUG', True) # Default to True for local run if not set
    host = '0.0.0.0' if debug_mode else '127.0.0.1' # Bind to all interfaces only in debug? Or always 0.0.0.0 for consistency? Let's use 0.0.0.0
    print(f"Starting Flask DEVELOPMENT server on port {port} with debug mode: {debug_mode}")
    # Use Werkzeug's run_simple for development, not suitable for production
    app.run(debug=debug_mode, port=port, host='0.0.0.0')