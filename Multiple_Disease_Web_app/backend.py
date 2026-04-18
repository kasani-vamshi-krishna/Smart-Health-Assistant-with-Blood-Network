import os
import pickle
import sqlite3
import secrets
import math
import json
import smtplib
import random
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import numpy as np
import google.generativeai as genai
from flask import Flask, request, jsonify, send_file, g
from flask_cors import CORS
from fpdf import FPDF
from werkzeug.security import generate_password_hash, check_password_hash
import io
import datetime
import jwt

# --- Initialization ---
app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5 MB uploads

# --- SMTP Config for OTP email ---
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', 'kasanivamshikrishna2024@gmail.com')
SMTP_PASS = os.environ.get('SMTP_PASS', 'jjxfufbhajpgeqvj')  # 16-char Gmail App Password (no spaces)
OTP_TTL_MINUTES = 10


def send_otp_email(to_email, otp, purpose='registration'):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Your Health AI verification code'
    msg['From'] = f'Health AI <{SMTP_USER}>'
    msg['To'] = to_email

    text_body = f"Your Health AI {purpose} code is: {otp}\n\nIt expires in {OTP_TTL_MINUTES} minutes."
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#4f46e5;margin:0 0 8px">Health AI verification</h2>
      <p style="color:#334155">Use this code to complete your {purpose}:</p>
      <div style="font-size:32px;letter-spacing:8px;font-weight:800;color:#111827;background:#fff;border:2px dashed #6366f1;padding:16px;text-align:center;border-radius:8px">{otp}</div>
      <p style="color:#64748b;font-size:13px;margin-top:16px">This code expires in {OTP_TTL_MINUTES} minutes. If you didn't request it, ignore this email.</p>
    </div>
    """
    msg.attach(MIMEText(text_body, 'plain'))
    msg.attach(MIMEText(html_body, 'html'))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, [to_email], msg.as_string())


def generate_otp():
    return f"{random.randint(100000, 999999)}"

DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'health_assistant.db')

# --- Configure Gemini API ---
try:
    genai.configure(api_key="AIzaSyDGf0yS2u0bzTKP-qEK8dcCz79a-X-aMwA")
    gemini_model = genai.GenerativeModel('gemini-2.0-flash')
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    gemini_model = None


# --- Database Setup ---
def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def column_exists(db, table, column):
    rows = db.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == column for r in rows)


def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT NOT NULL,
        blood_type TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        latitude REAL DEFAULT 0,
        longitude REAL DEFAULT 0,
        willing_to_donate INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # Backwards-compatible column additions for existing DBs
    new_columns = [
        ('role', "TEXT DEFAULT 'user'"),             # 'user' or 'hospital'
        ('hospital_name', 'TEXT'),
        ('license_number', 'TEXT'),
        ('verified', 'INTEGER DEFAULT 0'),
        ('profile_picture', 'TEXT'),                 # base64 data URL
        ('donor_quantity_ml', 'INTEGER DEFAULT 0'),
        ('donor_health_conditions', 'TEXT'),         # JSON
        ('donor_last_updated', 'TIMESTAMP'),
    ]
    for col, ddl in new_columns:
        if not column_exists(db, 'users', col):
            db.execute(f'ALTER TABLE users ADD COLUMN {col} {ddl}')

    db.execute('''CREATE TABLE IF NOT EXISTS prediction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        disease_type TEXT NOT NULL,
        inputs TEXT NOT NULL,
        prediction INTEGER NOT NULL,
        diagnosis TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        risk_category TEXT NOT NULL,
        plan TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS donation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_id INTEGER NOT NULL,
        hospital_id INTEGER NOT NULL,
        quantity_ml INTEGER,
        health_conditions TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(donor_id) REFERENCES users(id),
        FOREIGN KEY(hospital_id) REFERENCES users(id)
    )''')

    db.execute('''CREATE TABLE IF NOT EXISTS pending_otps (
        email TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        purpose TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INTEGER DEFAULT 0
    )''')

    # Seed a list of accepted hospital license numbers for simple verification.
    db.execute('''CREATE TABLE IF NOT EXISTS verified_hospitals (
        license_number TEXT PRIMARY KEY,
        hospital_name TEXT
    )''')
    seed = [
        ('APOLLO-HYD-001', 'Apollo Hospitals Hyderabad'),
        ('KIMS-HYD-002',   'KIMS Hospitals Hyderabad'),
        ('AIIMS-DEL-003',  'AIIMS Delhi'),
        ('FORTIS-BLR-004', 'Fortis Hospital Bangalore'),
        ('YASHODA-HYD-005','Yashoda Hospital Hyderabad'),
        ('MED-DEMO-0000',  'Demo Verified Hospital'),
    ]
    for lic, name in seed:
        db.execute('INSERT OR IGNORE INTO verified_hospitals (license_number, hospital_name) VALUES (?, ?)', (lic, name))

    db.commit()
    db.close()


init_db()


# --- JWT Helper ---
def create_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def decode_token(token):
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    user_id = decode_token(token)
    if not user_id:
        return None
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    return user


def user_to_dict(user):
    return {
        'id': user['id'],
        'full_name': user['full_name'],
        'email': user['email'],
        'blood_type': user['blood_type'],
        'phone': user['phone'],
        'age': user['age'],
        'gender': user['gender'],
        'city': user['city'],
        'state': user['state'],
        'latitude': user['latitude'],
        'longitude': user['longitude'],
        'willing_to_donate': user['willing_to_donate'],
        'role': user['role'] if user['role'] else 'user',
        'hospital_name': user['hospital_name'],
        'license_number': user['license_number'],
        'verified': user['verified'] or 0,
        'profile_picture': user['profile_picture'],
        'donor_quantity_ml': user['donor_quantity_ml'] or 0,
        'donor_health_conditions': json.loads(user['donor_health_conditions']) if user['donor_health_conditions'] else None,
    }


# --- Auth Endpoints ---
@app.route('/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    purpose = data.get('purpose', 'registration')
    if not email or '@' not in email:
        return jsonify({'error': 'A valid email is required'}), 400

    db = get_db()
    if purpose == 'registration':
        existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
        if existing:
            return jsonify({'error': 'An account with this email already exists'}), 409

    otp = generate_otp()
    expires = datetime.datetime.utcnow() + datetime.timedelta(minutes=OTP_TTL_MINUTES)
    db.execute(
        '''INSERT INTO pending_otps (email, otp, purpose, expires_at, attempts)
           VALUES (?, ?, ?, ?, 0)
           ON CONFLICT(email) DO UPDATE SET otp=excluded.otp, purpose=excluded.purpose,
                                            expires_at=excluded.expires_at, attempts=0''',
        (email, otp, purpose, expires.isoformat())
    )
    db.commit()

    try:
        send_otp_email(email, otp, purpose)
    except Exception as e:
        print(f"SMTP error: {e}")
        return jsonify({'error': 'Failed to send verification email. Please try again later.'}), 500

    return jsonify({'message': 'Verification code sent to your email', 'expires_in_minutes': OTP_TTL_MINUTES})


def verify_otp_or_error(email, otp):
    if not email or not otp:
        return 'Email and OTP are required'
    db = get_db()
    row = db.execute('SELECT * FROM pending_otps WHERE email = ?', (email,)).fetchone()
    if not row:
        return 'No verification code found. Please request a new one.'
    if row['attempts'] >= 5:
        return 'Too many attempts. Please request a new code.'
    try:
        expires_at = datetime.datetime.fromisoformat(row['expires_at'])
    except Exception:
        expires_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=1)
    if datetime.datetime.utcnow() > expires_at:
        return 'Verification code has expired. Please request a new one.'
    if str(row['otp']) != str(otp).strip():
        db.execute('UPDATE pending_otps SET attempts = attempts + 1 WHERE email = ?', (email,))
        db.commit()
        return 'Invalid verification code'
    # success — consume it
    db.execute('DELETE FROM pending_otps WHERE email = ?', (email,))
    db.commit()
    return None


@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    role = (data.get('role') or 'user').lower()
    required = ['full_name', 'email', 'password', 'phone', 'blood_type', 'age', 'gender', 'city', 'state', 'otp']
    if role == 'hospital':
        required += ['hospital_name', 'license_number']

    for field in required:
        if data.get(field) in (None, ''):
            return jsonify({'error': f'{field} is required'}), 400

    email = data['email'].strip().lower()
    otp_error = verify_otp_or_error(email, data.get('otp'))
    if otp_error:
        return jsonify({'error': otp_error}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'An account with this email already exists'}), 409

    verified = 0
    if role == 'hospital':
        row = db.execute(
            'SELECT license_number FROM verified_hospitals WHERE license_number = ?',
            (data['license_number'],)
        ).fetchone()
        if not row:
            return jsonify({'error': 'Hospital license number is not in the verified registry. Please contact support.'}), 400
        verified = 1

    password_hash = generate_password_hash(data['password'])
    willing = 1 if data.get('willing_to_donate') else 0
    donor_qty = int(data.get('donor_quantity_ml') or 0) if willing else 0
    donor_conds = json.dumps(data.get('donor_health_conditions') or {}) if willing else None

    try:
        cursor = db.execute(
            '''INSERT INTO users (full_name, email, password_hash, phone, blood_type, age, gender, city, state,
                                  latitude, longitude, willing_to_donate, role, hospital_name, license_number, verified,
                                  donor_quantity_ml, donor_health_conditions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (data['full_name'], email, password_hash, data['phone'],
             data['blood_type'], int(data['age']), data['gender'],
             data['city'], data['state'],
             float(data.get('latitude', 0)), float(data.get('longitude', 0)),
             willing,
             role,
             data.get('hospital_name'),
             data.get('license_number'),
             verified,
             donor_qty,
             donor_conds)
        )
        db.commit()
        user_id = cursor.lastrowid
        token = create_token(user_id)
        user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        return jsonify({'token': token, 'user': user_to_dict(user)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = create_token(user['id'])
    return jsonify({'token': token, 'user': user_to_dict(user)})


@app.route('/auth/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({'user': user_to_dict(user)})


@app.route('/auth/update-location', methods=['PUT'])
def update_location():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    db = get_db()
    db.execute(
        'UPDATE users SET latitude = ?, longitude = ?, city = COALESCE(?, city), state = COALESCE(?, state) WHERE id = ?',
        (float(data.get('latitude', 0)), float(data.get('longitude', 0)),
         data.get('city'), data.get('state'), user['id'])
    )
    db.commit()
    updated = db.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
    return jsonify({'message': 'Location updated', 'user': user_to_dict(updated)})


@app.route('/auth/toggle-donate', methods=['PUT'])
def toggle_donate():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    willing = 1 if data.get('willing_to_donate') else 0
    db = get_db()

    if willing == 1:
        quantity = int(data.get('donor_quantity_ml') or 0)
        conditions = data.get('donor_health_conditions') or {}
        db.execute(
            '''UPDATE users SET willing_to_donate = ?, donor_quantity_ml = ?,
                                donor_health_conditions = ?, donor_last_updated = CURRENT_TIMESTAMP
               WHERE id = ?''',
            (willing, quantity, json.dumps(conditions), user['id'])
        )
    else:
        db.execute('UPDATE users SET willing_to_donate = 0 WHERE id = ?', (user['id'],))

    db.commit()
    updated = db.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
    return jsonify({'message': 'Donation preference updated', 'user': user_to_dict(updated)})


@app.route('/auth/update-profile', methods=['PUT'])
def update_profile():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json()
    db = get_db()
    db.execute(
        '''UPDATE users
           SET full_name = COALESCE(?, full_name),
               phone = COALESCE(?, phone),
               city = COALESCE(?, city),
               state = COALESCE(?, state),
               profile_picture = COALESCE(?, profile_picture)
           WHERE id = ?''',
        (data.get('full_name'), data.get('phone'), data.get('city'),
         data.get('state'), data.get('profile_picture'), user['id'])
    )
    db.commit()
    updated = db.execute('SELECT * FROM users WHERE id = ?', (user['id'],)).fetchone()
    return jsonify({'message': 'Profile updated', 'user': user_to_dict(updated)})


# --- Blood Network ---
BLOOD_COMPATIBILITY = {
    'A+':  ['A+', 'A-', 'O+', 'O-'],
    'A-':  ['A-', 'O-'],
    'B+':  ['B+', 'B-', 'O+', 'O-'],
    'B-':  ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'O+':  ['O+', 'O-'],
    'O-':  ['O-'],
}


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def _require_verified_hospital(user):
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if (user['role'] or 'user') != 'hospital' or not user['verified']:
        return jsonify({'error': 'Only verified hospital accounts can access the Blood Network. This protects donor privacy.'}), 403
    return None


@app.route('/blood-network/search', methods=['POST'])
def search_donors():
    user = get_current_user()
    guard = _require_verified_hospital(user)
    if guard:
        return guard

    data = request.get_json()
    needed_blood_type = data.get('blood_type', user['blood_type'])
    user_lat = float(data.get('latitude', user['latitude']))
    user_lon = float(data.get('longitude', user['longitude']))
    radius_km = float(data.get('radius', 50))

    compatible_types = BLOOD_COMPATIBILITY.get(needed_blood_type, [])
    if not compatible_types:
        return jsonify({'error': 'Invalid blood type'}), 400

    db = get_db()
    placeholders = ','.join('?' * len(compatible_types))
    donors = db.execute(
        f'''SELECT id, full_name, phone, blood_type, city, state, latitude, longitude,
                   donor_quantity_ml, donor_health_conditions
            FROM users
            WHERE willing_to_donate = 1
            AND role = 'user'
            AND blood_type IN ({placeholders})
            AND id != ?
            AND latitude != 0 AND longitude != 0''',
        (*compatible_types, user['id'])
    ).fetchall()

    results = []
    for donor in donors:
        distance = haversine(user_lat, user_lon, donor['latitude'], donor['longitude'])
        if distance <= radius_km:
            results.append({
                'id': donor['id'],
                'full_name': donor['full_name'],
                'phone': donor['phone'],
                'blood_type': donor['blood_type'],
                'city': donor['city'],
                'state': donor['state'],
                'distance_km': round(distance, 1),
                'donor_quantity_ml': donor['donor_quantity_ml'] or 0,
                'donor_health_conditions': json.loads(donor['donor_health_conditions']) if donor['donor_health_conditions'] else {}
            })

    results.sort(key=lambda x: x['distance_km'])
    return jsonify({
        'donors': results,
        'total': len(results),
        'searched_blood_type': needed_blood_type,
        'compatible_types': compatible_types,
        'radius_km': radius_km
    })


@app.route('/blood-network/stats', methods=['GET'])
def blood_network_stats():
    db = get_db()
    total_donors = db.execute("SELECT COUNT(*) FROM users WHERE willing_to_donate = 1 AND role = 'user'").fetchone()[0]
    total_users = db.execute("SELECT COUNT(*) FROM users WHERE role = 'user'").fetchone()[0]
    total_hospitals = db.execute("SELECT COUNT(*) FROM users WHERE role = 'hospital' AND verified = 1").fetchone()[0]
    blood_type_counts = db.execute(
        "SELECT blood_type, COUNT(*) as count FROM users WHERE willing_to_donate = 1 AND role = 'user' GROUP BY blood_type"
    ).fetchall()
    return jsonify({
        'total_donors': total_donors,
        'total_users': total_users,
        'total_hospitals': total_hospitals,
        'blood_type_distribution': {row['blood_type']: row['count'] for row in blood_type_counts}
    })


# --- Load Machine Learning Models ---
def load_model(path):
    try:
        abs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
        with open(abs_path, 'rb') as file:
            return pickle.load(file)
    except Exception as e:
        print(f"Error loading model {path}: {e}")
        return None


diabetes_model = load_model('models/trained_model_diab.sav')
heart_disease_model = load_model('models/trained_model_heart.sav')
parkinsons_model = load_model('models/trained_model_par.sav')

# --- Normal Value Ranges ---
normal_ranges = {
    'diabetes': {
        'Pregnancies': {'min': 0, 'max': 6, 'avg': 3},
        'Glucose': {'min': 70, 'max': 100, 'avg': 85},
        'BloodPressure': {'min': 60, 'max': 80, 'avg': 70},
        'SkinThickness': {'min': 10, 'max': 30, 'avg': 20},
        'Insulin': {'min': 2, 'max': 25, 'avg': 15},
        'BMI': {'min': 18.5, 'max': 24.9, 'avg': 22},
        'DiabetesPedigreeFunction': {'min': 0.1, 'max': 0.5, 'avg': 0.3},
        'Age': {'min': 20, 'max': 50, 'avg': 33}
    },
    'heart': {
        'age': {'min': 20, 'max': 80, 'avg': 54},
        'sex': {'min': 0, 'max': 1, 'avg': 0.68},
        'cp': {'min': 0, 'max': 3, 'avg': 1},
        'trestbps': {'min': 90, 'max': 120, 'avg': 110},
        'chol': {'min': 150, 'max': 200, 'avg': 175},
        'fbs': {'min': 0, 'max': 0, 'avg': 0},
        'restecg': {'min': 0, 'max': 1, 'avg': 0.5},
        'thalach': {'min': 100, 'max': 160, 'avg': 130},
        'exang': {'min': 0, 'max': 0, 'avg': 0},
        'oldpeak': {'min': 0, 'max': 1, 'avg': 0.5},
        'slope': {'min': 1, 'max': 2, 'avg': 1.5},
        'ca': {'min': 0, 'max': 1, 'avg': 0.5},
        'thal': {'min': 0, 'max': 2, 'avg': 1}
    },
    'parkinsons': {
        'fo': {'min': 110, 'max': 180, 'avg': 150},
        'fhi': {'min': 120, 'max': 200, 'avg': 160},
        'flo': {'min': 80, 'max': 110, 'avg': 95},
        'Jitter_percent': {'min': 0.002, 'max': 0.006, 'avg': 0.004},
        'Jitter_Abs': {'min': 0.00001, 'max': 0.00005, 'avg': 0.00003},
        'RAP': {'min': 0.001, 'max': 0.003, 'avg': 0.002},
        'PPQ': {'min': 0.001, 'max': 0.004, 'avg': 0.0025},
        'DDP': {'min': 0.003, 'max': 0.01, 'avg': 0.006},
        'Shimmer': {'min': 0.01, 'max': 0.03, 'avg': 0.02},
        'Shimmer_dB': {'min': 0.1, 'max': 0.3, 'avg': 0.2},
        'APQ3': {'min': 0.005, 'max': 0.015, 'avg': 0.01},
        'APQ5': {'min': 0.007, 'max': 0.02, 'avg': 0.013},
        'APQ': {'min': 0.01, 'max': 0.03, 'avg': 0.02},
        'DDA': {'min': 0.015, 'max': 0.045, 'avg': 0.03},
        'NHR': {'min': 0.005, 'max': 0.025, 'avg': 0.015},
        'HNR': {'min': 20, 'max': 30, 'avg': 25},
        'RPDE': {'min': 0.4, 'max': 0.6, 'avg': 0.5},
        'DFA': {'min': 0.6, 'max': 0.8, 'avg': 0.7},
        'spread1': {'min': -7, 'max': -5, 'avg': -6},
        'spread2': {'min': 0.1, 'max': 0.3, 'avg': 0.2},
        'D2': {'min': 1.8, 'max': 2.8, 'avg': 2.3},
        'PPE': {'min': 0.1, 'max': 0.3, 'avg': 0.2}
    }
}


# --- PDF Generation ---
class ReportPDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 20)
        self.set_text_color(34, 47, 62)
        self.cell(0, 10, 'Health Assistant AI Report', 0, 1, 'L')
        self.set_font('Helvetica', '', 10)
        self.set_text_color(128)
        self.cell(0, 7, f"Report Generated: {datetime.datetime.now().strftime('%B %d, %Y %I:%M %p')}", 0, 1, 'L')
        self.line(10, 30, 200, 30)
        self.ln(10)

    def footer(self):
        self.set_y(-20)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(180, 0, 0)
        disclaimer = "Disclaimer: This AI-generated report is for informational purposes only and is not a substitute for professional medical advice."
        self.multi_cell(0, 4, disclaimer, 0, 'C')
        self.set_font('Helvetica', 'I', 9)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 14)
        self.set_fill_color(240, 245, 250)
        self.set_text_color(45, 52, 54)
        self.cell(0, 10, f'  {title}', 0, 1, 'L', 1)
        self.ln(5)

    def section_body(self, body):
        self.set_font('Helvetica', '', 11)
        self.set_text_color(80)
        clean_body = body.encode('latin-1', 'replace').decode('latin-1')
        self.multi_cell(0, 7, clean_body)
        self.ln()

    def result_summary(self, diagnosis, risk_score, risk_category):
        self.section_title("Prediction Summary")
        self.set_font('Helvetica', 'B', 12)
        self.cell(40, 8, 'Diagnosis:')
        self.set_font('Helvetica', '', 12)
        self.cell(0, 8, diagnosis, 0, 1)
        self.set_font('Helvetica', 'B', 12)
        self.cell(40, 8, 'Risk Score:')
        self.set_font('Helvetica', '', 12)
        self.cell(0, 8, f"{risk_score} / 100", 0, 1)
        self.set_font('Helvetica', 'B', 12)
        self.cell(40, 8, 'Risk Category:')
        self.set_font('Helvetica', '', 12)
        if risk_category == 'Low Risk':
            self.set_text_color(34, 139, 34)
        elif risk_category == 'Moderate Risk':
            self.set_text_color(255, 165, 0)
        else:
            self.set_text_color(220, 20, 60)
        self.cell(0, 8, risk_category, 0, 1)
        self.set_text_color(80)
        self.ln(5)

    def input_data_table(self, inputs):
        self.section_title("Your Submitted Data")
        self.set_font('Helvetica', 'B', 10)
        self.set_fill_color(220, 220, 220)
        self.cell(95, 8, 'Parameter', 1, 0, 'C', 1)
        self.cell(95, 8, 'Your Value', 1, 1, 'C', 1)
        self.set_font('Helvetica', '', 10)
        fill = False
        self.set_fill_color(247, 247, 247)
        for key, value in inputs.items():
            self.cell(95, 8, key.replace('_', ' ').title(), 1, 0, 'L', fill)
            self.cell(95, 8, str(value), 1, 1, 'C', fill)
            fill = not fill
        self.ln(5)


def get_risk_category(score):
    if score < 40:
        return 'Low Risk'
    elif 40 <= score < 70:
        return 'Moderate Risk'
    else:
        return 'High Risk'


# --- Prediction Endpoints ---
@app.route('/predict/<disease_name>', methods=['POST'])
def predict_disease(disease_name):
    models = {
        'diabetes': {'model': diabetes_model, 'diag_pos': 'High indication of Diabetes', 'diag_neg': 'Low indication of Diabetes'},
        'heart': {'model': heart_disease_model, 'diag_pos': 'High risk of Heart Disease', 'diag_neg': 'Low risk of Heart Disease'},
        'parkinsons': {'model': parkinsons_model, 'diag_pos': "Strong indicators of Parkinson's Disease", 'diag_neg': "Low indicators of Parkinson's Disease"}
    }

    if disease_name not in models:
        return jsonify({'error': 'Invalid disease name'}), 400

    config = models[disease_name]
    data = request.get_json()
    try:
        features = [float(data[key]) for key in data.keys()]
    except (KeyError, TypeError, ValueError) as e:
        return jsonify({'error': f'Invalid input: {e}'}), 400

    prediction = config['model'].predict([features])[0]
    score = int(np.random.randint(65, 98) if prediction == 1 else np.random.randint(5, 35))
    risk_category = get_risk_category(score)
    diagnosis = config['diag_pos'] if prediction == 1 else config['diag_neg']

    history_id = None
    user = get_current_user()
    if user:
        db = get_db()
        cursor = db.execute(
            '''INSERT INTO prediction_history (user_id, disease_type, inputs, prediction, diagnosis, risk_score, risk_category)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (user['id'], disease_name, json.dumps(data), int(prediction), diagnosis, score, risk_category)
        )
        db.commit()
        history_id = cursor.lastrowid

    return jsonify({
        'prediction': int(prediction),
        'diagnosis': diagnosis,
        'risk_score': score,
        'risk_category': risk_category,
        'normal_ranges': normal_ranges.get(disease_name, {}),
        'history_id': history_id
    })


@app.route('/history', methods=['GET'])
def list_history():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    db = get_db()
    rows = db.execute(
        '''SELECT id, disease_type, prediction, diagnosis, risk_score, risk_category, created_at
           FROM prediction_history WHERE user_id = ? ORDER BY created_at DESC''',
        (user['id'],)
    ).fetchall()
    return jsonify({'history': [dict(r) for r in rows]})


@app.route('/history/<int:history_id>', methods=['GET'])
def get_history_item(history_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    db = get_db()
    row = db.execute(
        'SELECT * FROM prediction_history WHERE id = ? AND user_id = ?',
        (history_id, user['id'])
    ).fetchone()
    if not row:
        return jsonify({'error': 'Not found'}), 404
    item = dict(row)
    item['inputs'] = json.loads(item['inputs']) if item['inputs'] else {}
    item['normal_ranges'] = normal_ranges.get(item['disease_type'], {})
    return jsonify({'item': item})


@app.route('/history/<int:history_id>', methods=['DELETE'])
def delete_history_item(history_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    db = get_db()
    db.execute('DELETE FROM prediction_history WHERE id = ? AND user_id = ?', (history_id, user['id']))
    db.commit()
    return jsonify({'message': 'Deleted'})


@app.route('/history/<int:history_id>/plan', methods=['PUT'])
def save_history_plan(history_id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json() or {}
    db = get_db()
    db.execute(
        'UPDATE prediction_history SET plan = ? WHERE id = ? AND user_id = ?',
        (data.get('plan'), history_id, user['id'])
    )
    db.commit()
    return jsonify({'message': 'Plan saved'})


@app.route('/generate-plan', methods=['POST'])
def generate_plan():
    if not gemini_model:
        return jsonify({'plan': "Gemini AI is not available. Please check the API key in the backend."})

    data = request.get_json()
    disease_type = data.get('disease_type')
    user_inputs = data.get('inputs')
    prediction = data.get('prediction')

    base_instruction = "IMPORTANT: Structure the response using markdown. Use '###' for main headings. For any lists of principles or tips, you MUST use bullet points starting with '*'. For any meal plans, exercise schedules, or daily routines, you MUST use a markdown table with clear headers. **Highlight** key terms using double asterisks."

    if prediction == 1:
        prompt_template = {
            'diabetes': f"As a health expert, create a supportive wellness plan for a person with a high risk of diabetes based on their data: {user_inputs}. {base_instruction}\n\n### Key Dietary Principles\n* [Provide a key principle, **highlighting** a key term.]\n* [Provide another principle...]\n\n### Sample 3-Day Meal Plan\n[Create a markdown table with columns: Day, Breakfast, Lunch, Dinner, Snacks]\n\n### Recommended Physical Activities\n[Create a markdown table with columns: Day, Activity, Duration, Intensity]",
            'heart': f"As a cardiac specialist, design a safe weekly plan for an individual at high risk for heart disease based on their data: {user_inputs}. {base_instruction}\n\n### Core Focus Areas\n* [Provide a key focus area, **highlighting** a key term.]\n* [Provide another focus area...]\n\n### Sample Weekly Exercise Schedule\n[Create a markdown table with columns: Day, Activity, Duration, Notes (e.g., Warm-up/Cool-down)]\n\n### Heart-Healthy Nutrition Guide\n* [Provide a key dietary tip...]\n* [Provide another tip...]",
            'parkinsons': f"As an occupational therapist, create a structured daily routine for a person with Parkinson's based on their data: {user_inputs}. {base_instruction}\n\n### Goals of This Routine\n* [Provide a key goal, **highlighting** a key term.]\n* [Provide another goal...]\n\n### Daily Structured Timetable\n[Create a markdown table with columns: Time Slot, Activity, Purpose/Notes]\n\n### Tips for Success\n* [Provide a tip...]\n* [Provide another tip...]"
        }
    else:
        prompt_template = {
            'diabetes': f"As a wellness coach, create a proactive lifestyle plan for a low-risk individual to prevent diabetes, based on their data: {user_inputs}. {base_instruction}\n\n### Nutrition Tips for Stable Energy\n* [Provide a key tip, **highlighting** a key term.]\n* [Provide another tip...]\n\n### Sample 3-Day Meal Ideas\n[Create a markdown table with columns: Day, Breakfast, Lunch, Dinner]\n\n### Fun Ways to Stay Active\n* [Provide a suggestion...]\n* [Provide another suggestion...]",
            'heart': f"As a fitness expert, devise a proactive wellness plan for a low-risk individual to maintain a strong heart, based on their data: {user_inputs}. {base_instruction}\n\n### Heart-Healthy Eating Habits\n* [Provide a key habit, **highlighting** a key term.]\n* [Provide another habit...]\n\n### Sample Weekly Fitness Routine\n[Create a markdown table with columns: Day, Focus (e.g., Cardio, Strength), Suggested Activity, Duration]\n\n### Stress Management Techniques\n* [Provide a technique...]\n* [Provide another technique...]",
            'parkinsons': f"As a brain health specialist, provide a proactive plan for a low-risk individual to support neurological health, based on their data: {user_inputs}. {base_instruction}\n\n### Pillars of Brain Health\n* [Provide a key pillar, **highlighting** a key term.]\n* [Provide another pillar...]\n\n### Weekly Cognitive & Physical Plan\n[Create a markdown table with columns: Day, Physical Activity, Cognitive Exercise, Nutrition Focus]\n\n### Long-term Habits\n* [Provide a habit...]\n* [Provide another habit...]"
        }

    try:
        prompt = prompt_template.get(disease_type, "Create a generic health plan.")
        response = gemini_model.generate_content(prompt)
        return jsonify({'plan': response.text})
    except Exception as e:
        return jsonify({'plan': f"Error generating plan from AI model: {e}"})


@app.route('/generate-pdf', methods=['POST'])
def generate_pdf_report():
    data = request.get_json()
    pdf = ReportPDF()
    pdf.add_page()
    pdf.result_summary(data['diagnosis'], data['risk_score'], data['risk_category'])
    pdf.input_data_table(data['inputs'])
    if data.get('plan'):
        pdf.section_title("Personalized AI-Generated Plan")
        pdf.section_body(data['plan'])
    pdf_buffer = io.BytesIO(pdf.output(dest='S').encode('latin-1'))
    pdf_buffer.seek(0)
    return send_file(pdf_buffer, as_attachment=True, download_name='Health_AI_Report.pdf', mimetype='application/pdf')


# --- Main Execution ---
if __name__ == '__main__':
    if all([diabetes_model, heart_disease_model, parkinsons_model]):
        app.run(debug=True)
    else:
        print("FATAL: Could not start the application because one or more machine learning models failed to load.")
