from flask import Flask, request, jsonify, send_from_directory, redirect, abort, render_template_string
from werkzeug.utils import secure_filename
from werkzeug.exceptions import HTTPException
import os
import sqlite3
import jwt
import bcrypt
import boto3
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv
from flask_cors import CORS
from PIL import Image
from io import BytesIO
import markdown2
from flask_restx import Api, Resource, fields, reqparse
from werkzeug.datastructures import FileStorage

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['JWT_SECRET'] = os.getenv('JWT_SECRET', 'your-secret-key')
app.config['JWT_EXPIRATION_MINUTES'] = int(os.getenv('JWT_EXPIRATION_MINUTES', '15'))  # Default 15 minutes
app.config['JWT_REFRESH_EXPIRATION_DAYS'] = int(os.getenv('JWT_REFRESH_EXPIRATION_DAYS', '7'))  # Default 7 days

# AWS Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')
BUCKET_NAME = os.getenv('AWS_S3_BUCKET_NAME')

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Initialize Flask-RESTX with custom documentation
api = Api(app, 
    version='1.0', 
    title='Musefuse API',
    description='Photo storage and sharing API',
    doc='/api/swagger',
    prefix='/api/v1',
    authorizations={
        'Bearer': {
            'type': 'apiKey',
            'in': 'header',
            'name': 'Authorization',
            'description': 'Enter: Bearer <JWT token>'
        }
    }
)

# Create namespaces without the /api/v1 prefix since it's handled above
ns_auth = api.namespace('', description='Authentication operations')
ns_photos = api.namespace('', description='Photo operations')

# Define models for request/response documentation
user_model = api.model('User', {
    'username': fields.String(required=True, description='Username'),
    'password': fields.String(required=True, description='Password')
})

auth_response = api.model('AuthResponse', {
    'error': fields.Boolean(description='Error status'),
    'token': fields.String(description='JWT token'),
    'expiresIn': fields.Integer(description='Token expiration in seconds')
})

error_response = api.model('ErrorResponse', {
    'error': fields.Boolean(description='Error status'),
    'message': fields.String(description='Error message')
})

photo_response = api.model('Photo', {
    'filename': fields.String(description='Photo filename'),
    'url': fields.String(description='Original photo URL'),
    'thumbnail_url': fields.String(description='Thumbnail URL'),
    'upload_time': fields.DateTime(description='Upload timestamp'),
    'owner': fields.String(description='Username of photo owner')
})

# File upload parser
upload_parser = api.parser()
upload_parser.add_argument('file', location='files', type=FileStorage, required=True)

# Global error handlers
@app.errorhandler(HTTPException)
def handle_http_exception(e):
    return jsonify({
        "error": True,
        "message": e.description
    }), e.code

@app.errorhandler(Exception)
def handle_generic_exception(e):
    app.logger.error(f"Unhandled exception: {str(e)}")
    return jsonify({
        "error": True,
        "message": "Internal server error"
    }), 500

# JWT token verification decorator with improved error messages
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return {
                "error": True,
                "message": "No token provided"
            }, 401
            
        try:
            parts = auth_header.split()
            if len(parts) != 2 or parts[0].lower() != 'bearer':
                return {
                    "error": True,
                    "message": "Invalid token format. Use 'Bearer <token>'"
                }, 401

            token = parts[1]
            
            data = jwt.decode(
                token, 
                app.config['JWT_SECRET'], 
                algorithms=['HS256'],
                options={
                    'verify_exp': True,
                    'verify_iat': True,
                    'require': ['exp', 'iat', 'user_id']
                }
            )
            
            # Instead of adding current_user_id as a parameter, add it to kwargs
            kwargs['current_user_id'] = data['user_id']
            return f(*args, **kwargs)
            
        except jwt.ExpiredSignatureError:
            return {
                "error": True,
                "message": "Token has expired. Please log in again."
            }, 401
        except jwt.InvalidTokenError as e:
            return {
                "error": True,
                "message": f"Invalid token: {str(e)}"
            }, 401
            
    return decorated

# Database initialization
def init_db():
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            s3_url TEXT NOT NULL,
            thumbnail_url TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            upload_time TIMESTAMP NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()

# Authentication routes with consistent error responses
@ns_auth.route('/register')
class Register(Resource):
    @api.expect(user_model)
    @api.response(201, 'User created successfully', error_response)
    @api.response(400, 'Validation error', error_response)
    def post(self):
        """Create a new user account"""
        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                "error": True,
                "message": "Missing username or password"
            }), 400

        try:
            password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
            conn = sqlite3.connect('database.db')
            c = conn.cursor()
            c.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)',
                     (data['username'], password_hash))
            conn.commit()
            conn.close()
            return jsonify({
                "error": False,
                "message": "User created successfully"
            }), 201
        except sqlite3.IntegrityError:
            return jsonify({
                "error": True,
                "message": "Username already exists"
            }), 400

@ns_auth.route('/login')
class Login(Resource):
    @api.expect(user_model)
    @api.response(200, 'Login successful', auth_response)
    @api.response(401, 'Invalid credentials', error_response)
    def post(self):
        """Authenticate and receive JWT token"""
        data = request.get_json()
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                "error": True,
                "message": "Missing username or password"
            }), 400

        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute('SELECT id, password_hash FROM users WHERE username = ?', (data['username'],))
        user = c.fetchone()
        conn.close()

        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user[1]):
            # Generate access token with configured expiration
            access_token = jwt.encode({
                'user_id': user[0],
                'iat': datetime.utcnow(),
                'exp': datetime.utcnow() + timedelta(minutes=app.config['JWT_EXPIRATION_MINUTES'])
            }, app.config['JWT_SECRET'])

            return jsonify({
                "error": False,
                "token": access_token,
                "expiresIn": app.config['JWT_EXPIRATION_MINUTES'] * 60  # seconds
            })

        return jsonify({
            "error": True,
            "message": "Invalid credentials"
        }), 401

# Optional: Token refresh endpoint
@app.route('/api/v1/refresh-token', methods=['POST'])
@token_required
def refresh_token(current_user_id):
    """
    Generate a new access token if the current one is still valid
    This allows extending the session without re-login
    """
    try:
        # Generate new token with fresh expiration
        new_token = jwt.encode({
            'user_id': current_user_id,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(minutes=app.config['JWT_EXPIRATION_MINUTES'])
        }, app.config['JWT_SECRET'])

        return jsonify({
            "error": False,
            "token": new_token,
            "expiresIn": app.config['JWT_EXPIRATION_MINUTES'] * 60
        })
    except Exception as e:
        return jsonify({
            "error": True,
            "message": "Could not refresh token"
        }), 500

# Photo routes with consistent error responses
@ns_photos.route('/photos')
class Photos(Resource):
    @api.doc(security='Bearer')
    @api.response(200, 'Success', [photo_response])
    @api.response(401, 'Unauthorized', error_response)
    @token_required
    def get(self, current_user_id):
        """Get all photos"""
        try:
            conn = sqlite3.connect('database.db')
            c = conn.cursor()
            c.execute('''
                SELECT p.filename, p.s3_url, p.thumbnail_url, p.upload_time, u.username 
                FROM photos p 
                JOIN users u ON p.user_id = u.id
            ''')
            photos = [{
                'filename': row[0],
                'url': row[1],
                'thumbnail_url': row[2],
                'upload_time': row[3],
                'owner': row[4]
            } for row in c.fetchall()]
            conn.close()
            return jsonify({
                "error": False,
                "data": photos
            })
        except Exception as e:
            return jsonify({
                "error": True,
                "message": f"Error fetching photos: {str(e)}"
            }), 500

@ns_photos.route('/photos/<filename>')
class PhotoDetail(Resource):
    @api.response(200, 'Success')
    @api.response(404, 'Photo not found', error_response)
    def get(self, filename):
        """Get a specific photo"""
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute('SELECT s3_url FROM photos WHERE filename = ?', (filename,))
        result = c.fetchone()
        conn.close()
        
        if result:
            return redirect(result[0])
        return jsonify({
            "error": True,
            "message": "Photo not found"
        }), 404

    @api.doc(security='Bearer')
    @api.response(200, 'Photo deleted successfully')
    @api.response(401, 'Unauthorized', error_response)
    @api.response(403, 'Forbidden', error_response)
    @api.response(404, 'Photo not found', error_response)
    @token_required
    def delete(self, filename, **kwargs):  # Use **kwargs to get current_user_id
        """Delete a photo"""
        current_user_id = kwargs.get('current_user_id')
        try:
            conn = sqlite3.connect('database.db')
            c = conn.cursor()
            
            # First get the URLs to know what to delete from S3
            c.execute('SELECT s3_url, thumbnail_url FROM photos WHERE filename = ? AND user_id = ?', 
                     (filename, current_user_id))
            result = c.fetchone()
            
            if not result:
                return {
                    "error": True,
                    "message": "Photo not found or unauthorized"
                }, 404

            # Extract keys from URLs
            s3_url, thumbnail_url = result
            original_key = f"originals/{filename}"
            thumbnail_key = f"thumbnails/{filename}"

            # Delete from S3
            try:
                s3_client.delete_object(Bucket=BUCKET_NAME, Key=original_key)
                s3_client.delete_object(Bucket=BUCKET_NAME, Key=thumbnail_key)
            except Exception as e:
                app.logger.error(f"S3 deletion error: {str(e)}")

            # Delete from database
            c.execute('DELETE FROM photos WHERE filename = ? AND user_id = ?', 
                     (filename, current_user_id))
            conn.commit()
            conn.close()
            
            return {
                "error": False,
                "message": "Photo deleted successfully"
            }, 200

        except Exception as e:
            app.logger.error(f"Delete error: {str(e)}")
            return {
                "error": True,
                "message": f"Error deleting photo: {str(e)}"
            }, 500

# Add this near the top of app.py with other route handlers
@app.route('/api/docs')
def api_docs():
    # Read the markdown file
    docs_path = os.path.join(os.path.dirname(__file__), 'docs', 'api.md')
    with open(docs_path, 'r') as f:
        content = f.read()
    
    # Convert markdown to HTML
    html_content = markdown2.markdown(content, extras=['fenced-code-blocks', 'tables'])
    
    # Wrap with HTML template
    docs_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Musefuse API Documentation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.0/github-markdown.min.css">
        <style>
            :root {{
                --bg-color: #0d1117;
                --text-color: #c9d1d9;
                --code-bg: #161b22;
                --border-color: #30363d;
                --link-color: #58a6ff;
            }}

            body {{
                background-color: var(--bg-color);
                color: var(--text-color);
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            }}

            .markdown-body {{
                color: var(--text-color);
                background: var(--bg-color);
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
            }}

            .markdown-body h1,
            .markdown-body h2,
            .markdown-body h3,
            .markdown-body h4 {{
                color: #ffffff;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 0.3em;
            }}

            .markdown-body code {{
                background-color: var(--code-bg);
                border-radius: 6px;
                padding: 0.2em 0.4em;
                font-size: 85%;
            }}

            .markdown-body pre {{
                background-color: var(--code-bg);
                border-radius: 6px;
                padding: 16px;
                overflow: auto;
            }}

            .markdown-body pre code {{
                background-color: transparent;
                padding: 0;
            }}

            .markdown-body a {{
                color: var(--link-color);
                text-decoration: none;
            }}

            .markdown-body a:hover {{
                text-decoration: underline;
            }}

            .markdown-body blockquote {{
                color: #8b949e;
                border-left: 0.25em solid var(--border-color);
            }}

            .markdown-body hr {{
                background-color: var(--border-color);
                border: 0;
            }}

            .markdown-body table {{
                border-collapse: collapse;
                width: 100%;
                margin: 1em 0;
            }}

            .markdown-body table th,
            .markdown-body table td {{
                border: 1px solid var(--border-color);
                padding: 6px 13px;
            }}

            .markdown-body table tr {{
                background-color: var(--bg-color);
                border-top: 1px solid var(--border-color);
            }}

            .markdown-body table tr:nth-child(2n) {{
                background-color: var(--code-bg);
            }}

            @media (max-width: 767px) {{
                .markdown-body {{
                    padding: 1rem;
                }}
            }}

            /* Syntax highlighting */
            .hljs {{
                color: #c9d1d9;
                background: var(--code-bg);
            }}
        </style>
    </head>
    <body>
        <article class="markdown-body">
            {html_content}
        </article>
    </body>
    </html>
    """
    return docs_html

# Initialize database on startup
init_db()

@app.route('/api/v1/upload', methods=['POST'])
@token_required
def upload_file(current_user_id):
    try:
        if 'file' not in request.files:
            return jsonify({
                "error": True,
                "message": "No file provided"
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                "error": True,
                "message": "No file selected"
            }), 400

        # Secure the filename
        filename = secure_filename(file.filename)
        
        # Load the original image
        image = Image.open(file)
        
        # Convert to RGB if needed (for PNG/HEIC support)
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Save original at full resolution and high quality
        original_buffer = BytesIO()
        image.save(original_buffer, format='JPEG', quality=95)  # High quality for original
        original_buffer.seek(0)
        
        # Create and save thumbnail separately
        thumbnail = image.copy()  # Make a copy for thumbnail
        thumbnail_size = (800, 800)  # Increased from 300x300
        thumbnail.thumbnail(thumbnail_size)
        thumbnail_buffer = BytesIO()
        thumbnail.save(thumbnail_buffer, format='JPEG', quality=90)  # Increased from 85
        thumbnail_buffer.seek(0)
        
        # Upload to S3
        original_key = f"originals/{filename}"
        thumbnail_key = f"thumbnails/{filename}"
        
        s3_client.upload_fileobj(original_buffer, BUCKET_NAME, original_key)
        s3_client.upload_fileobj(thumbnail_buffer, BUCKET_NAME, thumbnail_key)
        
        # Get S3 URLs
        original_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{original_key}"
        thumbnail_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{thumbnail_key}"
        
        # Save to database
        conn = sqlite3.connect('database.db')
        c = conn.cursor()
        c.execute('''
            INSERT INTO photos (filename, s3_url, thumbnail_url, user_id, upload_time)
            VALUES (?, ?, ?, ?, ?)
        ''', (filename, original_url, thumbnail_url, current_user_id, datetime.utcnow()))
        conn.commit()
        conn.close()
        
        return jsonify({
            "error": False,
            "message": "File uploaded successfully",
            "filename": filename,
            "s3_url": original_url,
            "thumbnail_url": thumbnail_url
        }), 201
        
    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        return jsonify({
            "error": True,
            "message": f"Error uploading file: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001) 