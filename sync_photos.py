from app import app, s3_client, BUCKET_NAME, AWS_REGION
import sqlite3
from PIL import Image
from io import BytesIO
from datetime import datetime

def sync_s3_to_db():
    # First, clear the photos table
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('DELETE FROM photos')
    conn.commit()
    
    # List all objects in bucket (both root and originals folder)
    all_files = []
    
    # Check root level files
    response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
    root_files = [item for item in response.get('Contents', []) 
                 if not item['Key'].startswith(('originals/', 'thumbnails/')) 
                 and item['Key'].lower().endswith(('.jpg', '.jpeg', '.png'))]
    all_files.extend(root_files)
    
    # Check originals folder
    response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix='originals/')
    original_files = [item for item in response.get('Contents', [])
                     if not item['Key'].endswith('/')]  # Skip folder itself
    all_files.extend(original_files)
    
    for item in all_files:
        key = item['Key']
        filename = key.split('/')[-1]  # Get filename without folder prefix
        
        try:
            # Get original file from S3
            response = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
            file_content = response['Body'].read()
            
            # Create thumbnail
            image = Image.open(BytesIO(file_content))
            
            # Calculate dimensions maintaining aspect ratio
            max_size = 1080
            ratio = min(max_size/float(image.size[0]), max_size/float(image.size[1]))
            new_size = tuple([int(x*ratio) for x in image.size])
            
            # High quality resize
            thumbnail = image.resize(new_size, Image.Resampling.LANCZOS)
            thumbnail_buffer = BytesIO()
            thumbnail.save(thumbnail_buffer, format='JPEG', quality=95)
            thumbnail_buffer.seek(0)
            
            # Upload thumbnail
            thumbnail_key = f"thumbnails/{filename.rsplit('.', 1)[0]}.jpg"
            s3_client.upload_fileobj(thumbnail_buffer, BUCKET_NAME, thumbnail_key)
            
            # Generate URLs
            original_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{key}"
            thumbnail_url = f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{thumbnail_key}"
            
            # Insert into database (using user_id 1 as default owner)
            c.execute('''
                INSERT INTO photos (filename, s3_url, thumbnail_url, user_id, upload_time) 
                VALUES (?, ?, ?, ?, ?)
            ''', (filename, original_url, thumbnail_url, 1, datetime.utcnow()))
            
            print(f"Added {filename} to database")
            
        except Exception as e:
            print(f"Error processing {filename}: {str(e)}")
            continue
    
    conn.commit()
    conn.close()
    print("Sync complete!")

if __name__ == "__main__":
    with app.app_context():
        sync_s3_to_db() 