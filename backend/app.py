"""
Natiqi Backend with SQLite Database
Complete version with all tables
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import inspect, text, or_
from decimal import Decimal
import json
import io
import csv

from models import db, Admin, Specialist, Patient, RegisteredUser, EEGSession, Alert, SystemLog, Model, PatientSettings
import os
import sys
import uuid
import secrets
from datetime import date, datetime, timedelta
from pathlib import Path

# Avoid Unicode issues on some Windows consoles
print(f'Python executable: {sys.executable}')

# ML inference (EEG 5-word SVM)
try:
    from ml.eeg_svm_5word import ModelNotReadyError, predict_window
except Exception as e:
    print(f'⚠️ ML import disabled: {e}')
    ModelNotReadyError = RuntimeError  # type: ignore
    predict_window = None  # type: ignore

# Windows consoles often use cp1252; avoid UnicodeEncodeError on log lines with emoji
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ══════════════════════════════════════════════════════════
# APP SETUP
# ══════════════════════════════════════════════════════════

app = Flask(__name__)

# SQLite database file location

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'natiqi.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'natiqi-dev-secret'


# Local dev: Expo picks an ephemeral port (scripts/run-expo-web.cjs); allow any browser origin.
# For a locked-down production API, replace with an explicit origin list.
CORS(app, resources={r"/*": {"origins": "*"}})


# Initialize database
db.init_app(app)


def ensure_registered_user_verification_columns():
    """Add verification columns when upgrading an existing SQLite DB (db.create_all does not alter tables)."""
    try:
        inspector = inspect(db.engine)
        cols = {c['name'] for c in inspector.get_columns('registered_user')}
    except Exception:
        return
    with db.engine.begin() as conn:
        if 'is_verified' not in cols:
            conn.execute(text(
                'ALTER TABLE registered_user ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 1'
            ))
        if 'verification_code' not in cols:
            conn.execute(text(
                'ALTER TABLE registered_user ADD COLUMN verification_code VARCHAR(10)'
            ))
        if 'verification_expires' not in cols:
            conn.execute(text(
                'ALTER TABLE registered_user ADD COLUMN verification_expires DATETIME'
            ))


def ensure_admin_specialist_gender_columns():
    """Add gender column when upgrading an existing SQLite DB."""
    for table in ('admin', 'specialist'):
        try:
            inspector = inspect(db.engine)
            cols = {c['name'] for c in inspector.get_columns(table)}
        except Exception:
            continue
        if 'gender' not in cols:
            with db.engine.begin() as conn:
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN gender VARCHAR(10)'))


def ensure_patient_room_numbers():
    """Assign unique random room numbers (4 digits) to patients with missing room (upgrade path)."""
    try:
        missing = Patient.query.filter(
            or_(Patient.room_number.is_(None), Patient.room_number == '')
        ).all()
    except Exception:
        return
    if not missing:
        return
    used = {
        str(r).strip()
        for (r,) in db.session.query(Patient.room_number).all()
        if r is not None and str(r).strip() != ''
    }
    try:
        for p in missing:
            for _ in range(500):
                cand = str(secrets.randbelow(9000) + 1000)
                if cand not in used:
                    p.room_number = cand
                    used.add(cand)
                    break
            else:
                cand = f'R{secrets.randbelow(90000) + 10000}'
                while cand in used:
                    cand = f'R{secrets.randbelow(90000) + 10000}'
                p.room_number = cand[:10]
                used.add(p.room_number)
        db.session.commit()
        print(f'🏠 Assigned room numbers to {len(missing)} patient(s)')
    except Exception as e:
        db.session.rollback()
        print(f'⚠️ ensure_patient_room_numbers: {e}')


def ensure_patient_password_column(default_password: str = 'user@123'):
    """Add patient.password when upgrading an existing SQLite DB, and backfill missing passwords."""
    try:
        inspector = inspect(db.engine)
        cols = {c['name'] for c in inspector.get_columns('patient')}
    except Exception:
        return

    with db.engine.begin() as conn:
        if 'password' not in cols:
            conn.execute(text('ALTER TABLE patient ADD COLUMN password VARCHAR(255)'))

    try:
        missing = Patient.query.filter(
            or_(Patient.password.is_(None), Patient.password == '')
        ).all()
    except Exception:
        return

    if not missing:
        return

    try:
        hashed = generate_password_hash(default_password)
        for p in missing:
            p.password = hashed
        db.session.commit()
        print(f'🔐 Set default password for {len(missing)} patient(s)')
    except Exception as e:
        db.session.rollback()
        print(f'⚠️ ensure_patient_password_column: {e}')


def generate_six_digit_code() -> str:
    return ''.join(secrets.choice('0123456789') for _ in range(6))


def write_system_log(user_name, user_national_id, event, role='unknown'):
    # Generate readable log ID: SYS-YYYYMMDD-XXXX
    today    = date.today().strftime('%Y%m%d')
    # Count how many logs exist today to get the sequence number
    count    = SystemLog.query.filter(
        SystemLog.log_id.like(f'SYS-{today}-%')
    ).count()
    log_id   = f'SYS-{today}-{str(count + 1).zfill(4)}'

    log = SystemLog(
        log_id           = log_id,
        user_name        = user_name,
        user_national_id = user_national_id,
        event            = event,
        role             = role,
    )
    db.session.add(log)
    db.session.commit()

# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

##======    Login   ======##

@app.route('/auth/login', methods=['POST'])

def login():

    """
    Login with database validation
    Checks Admin, Specialist, and RegisteredUser tables based on role
    """

    data = request.get_json()
    national_id = data.get('national_id', '')
    password    = data.get('password', '')
    role        = data.get('role', '')
    #role_norm   = str(role or '').strip()

    print(f"\n📥 Login attempt:")
    print(f"   ID: {national_id}")
    print(f"   Role: {role}")

    user = None

    # Find user based on role
    if role == 'admin':
        user = Admin.query.filter_by(national_id=national_id).first()
    elif role == 'specialist':
        user = Specialist.query.filter_by(national_id=national_id).first()
    elif role == 'RegisteredUser':
        user = RegisteredUser.query.filter_by(national_id=national_id).first() 
           
    if not user:
        print(f"❌ No {role} found with ID: {national_id}")
        return jsonify({'error': 'Invalid ID or password'}), 401
    
    # Check password
    if not check_password_hash(user.password, password):
        display = getattr(user, 'name', None) or national_id
        print(f"❌ Wrong password for user: {display}")
        return jsonify({'error': 'Invalid ID or password'}), 401

    if isinstance(user, RegisteredUser) and not user.is_verified:
        return jsonify({'error': 'Please verify your account with the code sent to your email (check dev hint on verify screen if testing).'}), 403
    
    print(f"✅ Login successful: {getattr(user, 'name', None) or national_id}")
    return jsonify(user.to_dict()), 200

##======    SignUp   ======##
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    # 1. Extract fields from what TypeScript sent
    national_id = data.get('national_id')
    name = (data.get('name') or '').strip()
    phone_num = data.get('phone_num')
    email = data.get('email')
    password = data.get('password')
    gender = data.get('gender')

    # 2. Check required fields
    if not all([national_id, name, email, password, phone_num, gender]):
        return jsonify({'error': 'All fields are required'}), 400
    if gender not in ('Male', 'Female'):
        return jsonify({'error': 'Gender must be Male or Female'}), 400

    existing = RegisteredUser.query.filter_by(national_id=national_id).first()
    # Verified accounts cannot be replaced
    if existing and existing.is_verified:
        return jsonify({'error': 'National ID already registered'}), 409

    # Email / phone must stay unique across other rows (allow same national_id to fix typos)
    email_owner = RegisteredUser.query.filter_by(email=email).first()
    if email_owner and email_owner.national_id != national_id:
        return jsonify({'error': 'Email already registered'}), 409
    phone_owner = RegisteredUser.query.filter_by(phone_num=phone_num).first()
    if phone_owner and phone_owner.national_id != national_id:
        return jsonify({'error': 'phone_num already registered'}), 409

    code = generate_six_digit_code()
    expires = datetime.utcnow() + timedelta(minutes=15)
    pw_hash = generate_password_hash(password)

    if existing:
        # Same ID, not verified yet — update details and issue a fresh code
        existing.name = name
        existing.phone_num = phone_num
        existing.email = email
        existing.password = pw_hash
        existing.gender = gender
        existing.verification_code = code
        existing.verification_expires = expires
        db.session.commit()
        msg = 'Details updated. Verify with the new code sent to your email (or dev hint below).'
    else:
        new_user = RegisteredUser(
            national_id=national_id,
            name=name,
            phone_num=phone_num,
            email=email,
            password=pw_hash,
            gender=gender,
            is_verified=False,
            verification_code=code,
            verification_expires=expires,
        )
        db.session.add(new_user)
        db.session.commit()
        msg = 'Account created successfully!'

    print(f"\n📧 Verification code for {email} (national_id={national_id}): {code}\n")

    payload = {'message': msg}
    # Local dev only: real app would email/SMS this code; never enable in production as-is.
    if app.debug or os.environ.get('RETURN_VERIFICATION_CODE') == '1':
        payload['dev_code'] = code
    return jsonify(payload), (200 if existing else 201)

##======    Verification   ======##

@app.route('/auth/verify', methods=['POST'])
def verify_account():
    data = request.get_json() or {}
    national_id = str(data.get('national_id', '')).strip()
    code = str(data.get('code', '')).strip()
    if not national_id or not code:
        return jsonify({'error': 'National ID and code are required'}), 400
    user = RegisteredUser.query.filter_by(national_id=national_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.is_verified:
        return jsonify({'message': 'Account is already verified'}), 200
    if not user.verification_code or user.verification_code != code:
        return jsonify({'error': 'Invalid verification code'}), 400
    if user.verification_expires and datetime.utcnow() > user.verification_expires:
        return jsonify({'error': 'Verification code has expired. Request a new code.'}), 400
    user.is_verified = True
    user.verification_code = None
    user.verification_expires = None
    db.session.commit()
    return jsonify({'message': 'Account verified. You can log in.'}), 200


##======    resend-verification   ======##

@app.route('/auth/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json() or {}
    national_id = str(data.get('national_id', '')).strip()
    if not national_id:
        return jsonify({'error': 'National ID is required'}), 400
    user = RegisteredUser.query.filter_by(national_id=national_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.is_verified:
        return jsonify({'error': 'Account is already verified'}), 400
    code = generate_six_digit_code()
    user.verification_code = code
    user.verification_expires = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()
    print(f"\n📧 New verification code for {user.email} (national_id={national_id}): {code}\n")
    payload = {'message': 'A new verification code was generated.'}
    if app.debug or os.environ.get('RETURN_VERIFICATION_CODE') == '1':
        payload['dev_code'] = code
    return jsonify(payload), 200

##======    Forget Password   ======##
@app.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Step 1: User provides their national_id + role → generate a reset code."""
    data        = request.get_json() or {}
    national_id = str(data.get('national_id', '') or '').strip()
    role        = str(data.get('role', '') or '').strip()

    if not national_id or not role:
        return jsonify({'error': 'national_id and role are required'}), 400

    if role == 'admin':
        user = Admin.query.filter_by(national_id=national_id).first()
    elif role == 'specialist':
        user = Specialist.query.filter_by(national_id=national_id).first()
    elif role == 'RegisteredUser':
        user = RegisteredUser.query.filter_by(national_id=national_id).first()
    else:
        return jsonify({'error': 'Invalid role'}), 400

    if not user:
        # Don't reveal whether the ID exists
        return jsonify({'error': 'No account found with this ID.'}), 404
    
    code    = generate_six_digit_code()
    expires = datetime.utcnow() + timedelta(minutes=15)

    user.verification_code    = code
    user.verification_expires = expires
    db.session.commit()

    print(f"\n🔑 Password reset code for national_id={national_id}: {code}\n")

    payload = {'message': 'If this ID is registered, a reset code has been generated.'}
    if app.debug or os.environ.get('RETURN_VERIFICATION_CODE') == '1':
        payload['dev_code'] = code
    return jsonify(payload), 200


##======    Reset Password   ======##

@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """Step 2: User provides national_id + role + code + new_password → update password."""
    data         = request.get_json() or {}
    national_id  = str(data.get('national_id', '') or '').strip()
    role         = str(data.get('role', '') or '').strip()
    code         = str(data.get('code', '') or '').strip()
    new_password = str(data.get('new_password', '') or '')

    if not all([national_id, role, code, new_password]):
        return jsonify({'error': 'national_id, role, code, and new_password are required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    if role == 'admin':
        user = Admin.query.filter_by(national_id=national_id).first()
    elif role == 'specialist':
        user = Specialist.query.filter_by(national_id=national_id).first()
    elif role == 'RegisteredUser':
        user = RegisteredUser.query.filter_by(national_id=national_id).first()
    else:
        return jsonify({'error': 'Invalid role'}), 400

    if not user:
        return jsonify({'error': 'Invalid ID or code'}), 400

    if not user.verification_code or user.verification_code != code:
        return jsonify({'error': 'Invalid or expired reset code'}), 400

    if user.verification_expires and datetime.utcnow() > user.verification_expires:
        return jsonify({'error': 'Reset code has expired. Request a new one.'}), 400

    user.password             = generate_password_hash(new_password)
    user.verification_code    = None
    user.verification_expires = None
    db.session.commit()

    print(f"✅ Password reset for national_id={national_id}")
    return jsonify({'message': 'Password updated successfully. You can now log in.'}), 200

# ══════════════════════════════════════════════════════════
#   ADMIN 
# ══════════════════════════════════════════════════════════


##======    Admin: Get all users   ======##
@app.route('/admin/users', methods=['GET'])
def get_all_users():
    admins      = Admin.query.all()
    specialists = Specialist.query.all()
    registeredUser    = RegisteredUser.query.all()

    users = []
    for a in admins:
        users.append({'id': a.national_id, 'name': a.name, 'email': a.email,
                      'role': 'Admin', 'status': 'active', 'nationalId': a.national_id,
                      'gender': (a.gender or '')})
    for s in specialists:
        users.append({'id': s.national_id, 'name': s.name, 'email': s.email,
                      'role': 'Specialist', 'status': 'active', 'nationalId': s.national_id,
                      'gender': (s.gender or '')})
    for p in registeredUser:
        users.append({'id': p.national_id, 'name': p.name or 'Pending', 'email': p.email,
                      'role': 'Registered User', 'status': 'active', 'nationalId': p.national_id, 'gender': p.gender or ''})

    print(f"📋 Returning {len(users)} users")
    return jsonify(users), 200


##======    Admin: Add user   ======##
@app.route('/admin/users', methods=['POST'])
def add_user():
    data        = request.get_json()
    national_id = data.get('national_id', '').strip()
    name        = data.get('name', '').strip()
    email       = data.get('email', '').strip()
    role        = data.get('role', '')
    phone       = (data.get('phone') or data.get('phone_num') or '').strip()
    gender_raw  = (data.get('gender') or '').strip()
    temp_password = 'Temp@1234'
    performed_by_name = data.get('performed_by_name', 'Admin')
    performed_by_id   = data.get('performed_by_id', 'unknown')
    tables =[Patient,Admin, Specialist, RegisteredUser]


    if gender_raw not in ('Male', 'Female', ''):
        return jsonify({'error': 'Gender must be Male or Female'}), 400
    gender_store = gender_raw if gender_raw in ('Male', 'Female') else None

    if not all([national_id, name, email, role]):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        if role == 'Admin':
            if Admin.query.filter_by(national_id=national_id).first():
                return jsonify({'error': 'National ID already exists'}), 409
            if Admin.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 409
            db.session.add(Admin(
                national_id=national_id,
                name=name,
                email=email,
                password=generate_password_hash(temp_password),
                gender=gender_store,
            ))
        elif role == 'Specialist':
            if Specialist.query.filter_by(national_id=national_id).first():
                return jsonify({'error': 'National ID already exists'}), 409
            if Specialist.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 409
            db.session.add(Specialist(
                national_id=national_id,
                name=name,
                email=email,
                password=generate_password_hash(temp_password),
                gender=gender_store,
            ))
        elif role in ('Registered User', 'Patient'):
            if not phone:
                return jsonify({'error': 'Phone number is required for registered users'}), 400
            if gender_store not in ('Male', 'Female'):
                return jsonify({'error': 'Gender is required for registered users'}), 400
            
            for table in tables:
                if table.query.filter_by(national_id=national_id).first():
                    return jsonify({'error': 'National ID already registered'}), 409
        
            if RegisteredUser.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 409
            if RegisteredUser.query.filter_by(phone_num=phone).first():
                return jsonify({'error': 'Phone number already exists'}), 409
            db.session.add(RegisteredUser(
                national_id=national_id,
                name=name,
                email=email,
                phone_num=phone,
                gender=gender_store,
                password=generate_password_hash(temp_password),
                is_verified=True,
                verification_code=None,
                verification_expires=None,
            ))
            role = 'Registered User'
        else:
            return jsonify({'error': f'Unknown role: {role}'}), 400

        db.session.commit()
        print(f"✅ Admin added {role}: {name}")
        write_system_log(performed_by_name, performed_by_id, f'Added new {role}: {name} — ID: {national_id}', role='Admin')
        return jsonify({
            'message': f'{role} added successfully',
            'temp_password': temp_password,
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
        return jsonify({'error': str(e)}), 500


##======    Admin: Delete user   ======##
@app.route('/admin/users/<national_id>', methods=['DELETE'])
def delete_user(national_id):
    from models import EEGSession, Alert
    role = request.args.get('role', '')
    data              = request.get_json(silent=True) or {}
    performed_by_name = data.get('performed_by_name', 'Admin')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if role == 'Admin':
        user = Admin.query.filter_by(national_id=national_id).first()
    elif role == 'Specialist':
        user = Specialist.query.filter_by(national_id=national_id).first()
    else:
        user = RegisteredUser.query.filter_by(national_id=national_id).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if role == 'Admin' and national_id == performed_by_id:
        return jsonify({'error': 'You cannot delete your own account.'}), 403

    # If deleting a specialist, clean up their related records first
    # (because eeg_session.specialist_national_id is NOT NULL)
    if role == 'Specialist':
        sessions = EEGSession.query.filter_by(specialist_national_id=national_id).all()
        for session in sessions:
            # Delete alerts linked to this session first
            Alert.query.filter_by(alert_session_id=session.session_id).delete()
        # Now delete the sessions
        EEGSession.query.filter_by(specialist_national_id=national_id).delete()
        # Unlink their patients (set specialist to None — patient stays, just unassigned)
        Patient.query.filter_by(specialist_national_id=national_id).update(
            {'specialist_national_id': None}
        )

    db.session.delete(user)
    db.session.commit()
    print(f"🗑️ Deleted {role}: {national_id}")
    write_system_log(performed_by_name, performed_by_id, f'Deleted user: {user.name} — ID: {national_id}', role='Admin')
    return jsonify({'message': 'User deleted successfully'}), 200

##======    Admin: Edit user   ======##
@app.route('/admin/users/<national_id>', methods=['PUT'])
def edit_user(national_id):
    data  = request.get_json()
    name  = data.get('name', '').strip()
    email = data.get('email', '').strip()
    role  = data.get('role', '')
    performed_by_name = data.get('performed_by_name', 'Admin')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if not all([name, email]):
        return jsonify({'error': 'Name and email are required'}), 400
    if role == 'Admin':
        user = Admin.query.filter_by(national_id=national_id).first()
    elif role == 'Specialist':
        user = Specialist.query.filter_by(national_id=national_id).first()
    else:
        user = RegisteredUser.query.filter_by(national_id=national_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.name  = name
    user.email = email
    db.session.commit()
    write_system_log(performed_by_name, performed_by_id, f'Edited user info: {user.name} — ID: {national_id}', role='Admin')
    return jsonify({'message': 'User updated successfully'}), 200

def _current_production_model():
    """Prefer latest Active model; otherwise latest row by id."""
    m = Model.query.filter_by(model_status='Active').order_by(Model.model_id.desc()).first()
    if not m:
        m = Model.query.order_by(Model.model_id.desc()).first()
    return m


##======    Admin: Current model metadata (for Models page)   ======##
@app.route('/admin/current-model', methods=['GET'])
def get_current_model_info():
    m = _current_production_model()
    if not m:
        return jsonify({
            'model_id': None,
            'model_name': '',
            'model_version': '',
            'training_date': '',
        }), 200
    td = m.training_date
    date_str = td.date().isoformat() if td else ''
    return jsonify({
        'model_id': m.model_id,
        'model_name': m.model_name or '',
        'model_version': m.model_version or '',
        'training_date': date_str,
    }), 200


@app.route('/admin/current-model', methods=['PUT'])
def put_current_model_info():
    data = request.get_json() or {}
    name = data.get('model_name', '').strip()
    version = data.get('model_version', '').strip()
    date_str = data.get('training_date', '').strip()
    performed_by_name = data.get('performed_by_name', 'Admin')
    performed_by_id = str(data.get('performed_by_id', '') or '').strip() or 'unknown'

    if not name or not version or not date_str:
        return jsonify({'error': 'Model name, version, and training date are required'}), 400
    try:
        parsed = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Training date must be YYYY-MM-DD'}), 400
    training_dt = datetime.combine(parsed, datetime.min.time())

    admin_row = Admin.query.filter_by(national_id=performed_by_id).first()
    if not admin_row:
        admin_row = Admin.query.first()
    if not admin_row:
        return jsonify({'error': 'No admin account available to attach model'}), 500
    admin_nat = admin_row.national_id

    m = _current_production_model()
    try:
        if m:
            m.model_name = name
            m.model_version = version
            m.training_date = training_dt
        else:
            db.session.add(Model(
                model_name=name,
                model_version=version,
                model_accuracy=Decimal('0.9500'),
                model_status='Active',
                training_date=training_dt,
                admin_national_id=admin_nat,
            ))
        db.session.commit()
        write_system_log(
            performed_by_name,
            performed_by_id,
            f'Updated production model: {name} ({version}), trained {date_str}',
            role='Admin',
        )
        return jsonify({'message': 'Model information saved'}), 200
    except Exception as e:
        db.session.rollback()
        print(f'❌ Model update error: {e}')
        return jsonify({'error': str(e)}), 500


##======    Admin: System Logs   ======##
@app.route('/admin/system-logs', methods=['GET'])
def get_system_logs():
    logs = SystemLog.query.order_by(SystemLog.log_timestamp.desc()).limit(100).all()
    result = []
    for log in logs:
        result.append({
            'id':          log.log_id,
            'userName':    log.user_name,
            'role':        log.role or '—',
            'nationalId':  log.user_national_id,
            'event':       log.event,
            'timestamp':   log.log_timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        })
    return jsonify(result), 200


# ══════════════════════════════════════════════════════════
#   ADMIN: Model artifact status + sessions
# ══════════════════════════════════════════════════════════

@app.route('/admin/model-artifact-status', methods=['GET'])
def admin_model_artifact_status():
    repo_root = Path(BASE_DIR).parent
    saved_dir = repo_root / 'Saved_Model'
    pkl_path = saved_dir / 'natiqi_5word_svm_pipeline.pkl'
    config_path = saved_dir / 'config.json'
    metadata_path = saved_dir / 'metadata.json'

    payload = {
        'pkl_exists': pkl_path.exists(),
        'pkl_path': str(pkl_path),
        'pkl_size_bytes': int(pkl_path.stat().st_size) if pkl_path.exists() else 0,
        'pkl_modified_at': datetime.fromtimestamp(pkl_path.stat().st_mtime).isoformat() if pkl_path.exists() else '',
        'config': {},
        'metadata': {},
    }
    try:
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                payload['config'] = json.load(f)
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                payload['metadata'] = json.load(f)
    except Exception as e:
        payload['read_error'] = str(e)

    return jsonify(payload), 200


@app.route('/admin/sessions', methods=['GET'])
def admin_list_sessions():
    limit = request.args.get('limit', default=100, type=int)
    q = EEGSession.query.order_by(EEGSession.session_id.desc()).limit(max(1, min(limit, 500))).all()
    out = []
    for s in q:
        out.append({
            'session_id': s.session_id,
            'patient_national_id': str(s.patient_national_id),
            'specialist_national_id': (str(s.specialist_national_id) if s.specialist_national_id else ''),
            'model_id': s.model_id,
            'start_time': s.start_time.isoformat() if s.start_time else '',
            'end_time': s.end_time.isoformat() if s.end_time else '',
            'detected_word': s.detected_word,
            'confidence_level': float(s.confidence_level) if s.confidence_level is not None else None,
            'device': s.device or '',
            'channels': int(s.channels) if s.channels is not None else 14,
            'session_status': s.session_status,
        })
    return jsonify(out), 200


# ══════════════════════════════════════════════════════════
#   ML (EEG inference)
# ══════════════════════════════════════════════════════════

@app.route('/ml/predict-window', methods=['POST'])
def ml_predict_window():
    if predict_window is None:
        return jsonify({'error': 'ML module not available on server'}), 500

    data = request.get_json(silent=True) or {}
    window = data.get('window', None)
    if window is None:
        return jsonify({'error': 'Missing required field: window'}), 400

    try:
        # Expect 14x128 numeric matrix
        pred = predict_window(window)
        return jsonify(pred.to_json()), 200
    except ModelNotReadyError as e:
        return jsonify({'error': str(e)}), 503
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        import traceback
        print('❌ /ml/predict-window error:')
        traceback.print_exc()
        return jsonify({'error': 'Inference failed'}), 500


@app.route('/eeg/sessions', methods=['POST'])
def create_eeg_session_from_window():
    """
    Create an EEGSession row by running ML inference on a provided 14x128 window.
    This is a starter endpoint for integration/testing; real devices will likely
    send multiple windows per session later.
    """
    if predict_window is None:
        return jsonify({'error': 'ML module not available on server'}), 500

    data = request.get_json(silent=True) or {}
    patient_national_id = str(data.get('patient_national_id', '')).strip()
    specialist_national_id = str(data.get('specialist_national_id', '')).strip() or None
    window = data.get('window', None)
    device = (data.get('device') or 'EPOC X').strip()

    if not patient_national_id or window is None:
        return jsonify({'error': 'patient_national_id and window are required'}), 400

    patient = Patient.query.filter_by(national_id=patient_national_id).first()
    registered_user = RegisteredUser.query.filter_by(national_id=patient_national_id).first()

    if not patient and not registered_user:
        return jsonify({'error': 'Patient not found'}), 404

    patient_id_to_use = patient_national_id  

    specialist_row = None
    if specialist_national_id:
        specialist_row = Specialist.query.filter_by(national_id=specialist_national_id).first()

    try:
        pred = predict_window(window)
    except ModelNotReadyError as e:
        return jsonify({'error': str(e)}), 503
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f'❌ /eeg/sessions inference error: {e}')
        return jsonify({'error': 'Inference failed'}), 500

    now = datetime.utcnow()
    # Attach current production model row if available
    m = _current_production_model()
    try:
        row = EEGSession(
            patient_national_id=patient_id_to_use,
            specialist_national_id=(specialist_row.national_id if specialist_row else None),
            model_id=(m.model_id if m else None),
            start_time=now,
            end_time=now,
            detected_word=pred.predicted_word_ar,
            confidence_level=Decimal(str(pred.confidence)),
            device=device,
            channels=14,
            session_status='Ended',
        )
        db.session.add(row)
        db.session.commit()
        return jsonify({
            'message': 'EEG session created',
            'session_id': row.session_id,
            'prediction': pred.to_json(),
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f'❌ /eeg/sessions db error: {e}')
        return jsonify({'error': 'Failed to save session'}), 500


# ══════════════════════════════════════════════════════════
#   SPECIALIST: Sessions
# ══════════════════════════════════════════════════════════

@app.route('/specialist/sessions', methods=['GET'])
def specialist_list_sessions():
    specialist_id = request.args.get('specialist_id', default='', type=str).strip()
    patient_id = request.args.get('patient_national_id', default='', type=str).strip()
    limit = request.args.get('limit', default=100, type=int)

    q = EEGSession.query
    if specialist_id:
        q = q.filter(EEGSession.specialist_national_id == specialist_id)
    if patient_id:
        q = q.filter(EEGSession.patient_national_id == patient_id)

    sessions = q.order_by(EEGSession.session_id.desc()).limit(max(1, min(limit, 500))).all()
    out = []
    for s in sessions:
        out.append({
            'session_id': s.session_id,
            'patient_national_id': str(s.patient_national_id),
            'specialist_national_id': (str(s.specialist_national_id) if s.specialist_national_id else ''),
            'model_id': s.model_id,
            'start_time': s.start_time.isoformat() if s.start_time else '',
            'end_time': s.end_time.isoformat() if s.end_time else '',
            'detected_word': s.detected_word,
            'confidence_level': float(s.confidence_level) if s.confidence_level is not None else None,
            'device': s.device or '',
            'channels': int(s.channels) if s.channels is not None else 14,
            'session_status': s.session_status,
        })
    return jsonify(out), 200


# ══════════════════════════════════════════════════════════
#   SPECIALIST 
# ══════════════════════════════════════════════════════════
##======    Specialist: Get patients   ======##
@app.route('/specialist/patients', methods=['GET'])
def get_patients():
    # Optional: filter by specialist's national_id
    specialist_id = request.args.get('specialist_id')

    if specialist_id:
        patients = Patient.query.filter_by(specialist_national_id=specialist_id).all()
    else:
        patients = Patient.query.all()

    result = []
    for p in patients:
        result.append({
            'id':          p.national_id,
            'nationalId':  p.national_id,
            'roomNumber':  (p.room_number or '').strip(),
            'name':        p.name,
            'dob':         p.date_of_birth.strftime('%Y-%m-%d') if p.date_of_birth else '',
            'gender':      p.gender or '',
            'device':      p.device or 'Emotiv EPOC X',
            'status':      p.status or 'Active',
        })

    print(f"📋 Returning {len(result)} patients")
    return jsonify(result), 200


##======    Specialist: Add patient   ======##
@app.route('/specialist/patients', methods=['POST'])
def add_patient():
    data          = request.get_json()
    national_id   = data.get('national_id', '').strip()
    room_number   = data.get('room_number', '').strip()
    name          = data.get('name', '').strip()
    dob           = data.get('dob', '').strip()       # format: YYYY-MM-DD
    gender        = data.get('gender', '').strip()
    specialist_id = data.get('specialist_id', '').strip()
    performed_by_name = data.get('performed_by_name', 'Specialist')
    performed_by_id   = data.get('performed_by_id', 'unknown')
    tables =[Patient,Admin, Specialist, RegisteredUser]

    if not all([national_id, room_number, name, dob]):
        return jsonify({'error': 'Room number, name, National ID, and DOB are required'}), 400
    if len(room_number) > 10:
        return jsonify({'error': 'Room number must be at most 10 characters'}), 400

    for table in tables:
        if table.query.filter_by(national_id=national_id).first():
            return jsonify({'error': 'National ID already registered'}), 409
        
    if Patient.query.filter_by(room_number=room_number).first():
        return jsonify({'error': 'Room number already in use'}), 409

    try:
        from datetime import date
        dob_parsed = date.fromisoformat(dob)   # validates YYYY-MM-DD format

        new_patient = Patient(
            national_id            = national_id,
            name                   = name,
            password               = generate_password_hash('user@123'),
            date_of_birth          = dob_parsed,
            gender                 = gender,
            room_number            = room_number,
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = specialist_id or None,
        )
        db.session.add(new_patient)
        db.session.commit()

        print(f"✅ Added patient: {name}")
        write_system_log(performed_by_name, performed_by_id, f'Added new patient: {name} — ID: {national_id}', role='Specialist')
        return jsonify({'message': 'Patient added successfully'}), 201

    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
        return jsonify({'error': str(e)}), 500


##======    Specialist: Delete patient   ======##
@app.route('/specialist/patients/<national_id>', methods=['DELETE'])
def delete_patient(national_id):
    patient = Patient.query.filter_by(national_id=national_id).first()
    data              = request.get_json(silent=True) or {}
    performed_by_name = data.get('performed_by_name', 'Specialist')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    try:
        # Delete alerts linked to this patient's sessions first
        sessions = EEGSession.query.filter_by(patient_national_id=national_id).all()
        for session in sessions:
            Alert.query.filter_by(alert_session_id=session.session_id).delete()

        # Delete the sessions themselves
        EEGSession.query.filter_by(patient_national_id=national_id).delete()

        # Delete patient settings
        PatientSettings.query.filter_by(user_national_id=national_id).delete()

        # Now safe to delete the patient
        db.session.delete(patient)
        db.session.commit()

        print(f"🗑️ Deleted patient: {national_id}")
        write_system_log(performed_by_name, performed_by_id, f'Deleted patient: {patient.name} — ID: {national_id}', role='Specialist')
        return jsonify({'message': 'Patient deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Delete patient error: {e}")
        return jsonify({'error': str(e)}), 500

##======    Specialist: Edit patient   ======##
@app.route('/specialist/patients/<national_id>', methods=['PUT'])
def edit_patient(national_id):
    data   = request.get_json()
    room_number = data.get('room_number', '').strip()
    name   = data.get('name', '').strip()
    dob    = data.get('dob', '').strip()
    gender = data.get('gender', '').strip()
    performed_by_name = data.get('performed_by_name', 'Specialist')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if not all([room_number, name, dob]):
        return jsonify({'error': 'Room number, name, and DOB are required'}), 400
    if len(room_number) > 10:
        return jsonify({'error': 'Room number must be at most 10 characters'}), 400
    patient = Patient.query.filter_by(national_id=national_id).first()
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    taken = Patient.query.filter(
        Patient.room_number == room_number,
        Patient.national_id != national_id,
    ).first()
    if taken:
        return jsonify({'error': 'Room number already in use'}), 409
    try:
        from datetime import date
        patient.room_number   = room_number
        patient.name          = name
        patient.date_of_birth = date.fromisoformat(dob)
        patient.gender        = gender
        db.session.commit()
        write_system_log(performed_by_name, performed_by_id, f'Edited patient info: {patient.name} — ID: {national_id}', role='Specialist')
        return jsonify({'message': 'Patient updated successfully'}), 200
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

##======    Specialist: Toggle patient status   ======##
@app.route('/specialist/patients/<national_id>/status', methods=['PUT'])
def toggle_patient_status(national_id):
    data              = request.get_json(silent=True) or {}
    performed_by_name = data.get('performed_by_name', 'Specialist')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    patient = Patient.query.filter_by(national_id=national_id).first()

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    # Toggle between stable/active and suspended
    if patient.status ==  'Active':
        patient.status = 'Inactive'
    else:
        patient.status = 'Active'

    db.session.commit()
    print(f"⏸️ Toggled patient {national_id} status to: {patient.status}")
    write_system_log(performed_by_name, performed_by_id, f'Toggled patient status: {patient.name} — ID: {national_id}', role='Specialist')
    return jsonify({'message': 'Status updated', 'status': patient.status}), 200



# ══════════════════════════════════════════════════════════
#   REGISTRED USER 
# ══════════════════════════════════════════════════════════
##======    Update user profile   ======##
@app.route('/profile/update', methods=['PUT'])
def update_profile():
    data        = request.get_json()
    national_id = data.get('national_id', '').strip()
    role        = data.get('role', '')
    name        = data.get('name', '').strip()
    email       = data.get('email', '').strip()
    phone       = data.get('phone', '').strip()

    if not all([national_id, role, name, email]):
        return jsonify({'error': 'Required fields missing'}), 400

    if role == 'admin':
        user = Admin.query.filter_by(national_id=national_id).first()
    elif role == 'specialist':
        user = Specialist.query.filter_by(national_id=national_id).first()
    elif role in ('patient', 'Patient'):
        user = Patient.query.filter_by(national_id=national_id).first()
    else:
        user = RegisteredUser.query.filter_by(national_id=national_id).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Patients don't have email in our schema; only validate uniqueness for roles that store it
    if role in ('patient', 'Patient'):
        user.name = name
        db.session.commit()
        print(f"✅ Patient profile updated: {name} ({national_id})")
        return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()}), 200

    # Check email not already taken by someone else
    if role == 'admin':
        existing = Admin.query.filter_by(email=email).first()
    elif role == 'specialist':
        existing = Specialist.query.filter_by(email=email).first()
    else:
        existing = RegisteredUser.query.filter_by(email=email).first()

    if existing and existing.national_id != national_id:
        return jsonify({'error': 'Email already in use'}), 409

    user.name  = name
    user.email = email
    if hasattr(user, 'phone') and phone:
        user.phone = phone
    if hasattr(user, 'phone_num') and phone:
        user.phone_num = phone

    db.session.commit()
    print(f"✅ Profile updated: {name} ({national_id})")
    return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()}), 200


# ══════════════════════════════════════════════════════════
#   PATIENT SETTINGS (RegisteredUser)
# ══════════════════════════════════════════════════════════

def _get_or_create_patient_settings(national_id: str) -> PatientSettings:
    s = PatientSettings.query.filter_by(user_national_id=national_id).first()
    if s:
        return s
    s = PatientSettings(user_national_id=national_id)
    db.session.add(s)
    db.session.commit()
    return s


@app.route('/patient/settings', methods=['GET'])
def get_patient_settings():
    national_id = str(request.args.get('national_id', '') or '').strip()
    if not national_id:
        return jsonify({'error': 'national_id is required'}), 400
    user = RegisteredUser.query.filter_by(national_id=national_id).first()
    patient = Patient.query.filter_by(national_id=national_id).first()
    if not user and not patient:
        return jsonify({'error': 'User not found'}), 404
    s = _get_or_create_patient_settings(national_id)
    return jsonify(s.to_dict()), 200


@app.route('/patient/settings', methods=['PUT'])
def put_patient_settings():
    data = request.get_json(silent=True) or {}
    national_id = str(data.get('national_id', '') or '').strip()
    if not national_id:
        return jsonify({'error': 'national_id is required'}), 400
    user = RegisteredUser.query.filter_by(national_id=national_id).first()
    patient = Patient.query.filter_by(national_id=national_id).first()
    if not user and not patient:
        return jsonify({'error': 'User not found'}), 404

    s = _get_or_create_patient_settings(national_id)

    def b(key: str, default: bool) -> bool:
        v = data.get(key, default)
        return bool(v)

    try:
        s.notify_hunger = b('notify_hunger', s.notify_hunger)
        s.notify_thirst = b('notify_thirst', s.notify_thirst)
        s.notify_alarm = b('notify_alarm', s.notify_alarm)
        s.notify_bathroom = b('notify_bathroom', s.notify_bathroom)
        s.notify_medicine = b('notify_medicine', s.notify_medicine)

        mc = data.get('min_confidence', None)
        if mc is not None:
            mc_f = float(mc)
            if mc_f < 0 or mc_f > 1:
                return jsonify({'error': 'min_confidence must be between 0 and 1'}), 400
            s.min_confidence = Decimal(str(round(mc_f, 4)))

        rc = data.get('require_consecutive', None)
        if rc is not None:
            rc_i = int(rc)
            if rc_i < 1 or rc_i > 5:
                return jsonify({'error': 'require_consecutive must be between 1 and 5'}), 400
            s.require_consecutive = rc_i

        if 'calibration_enabled' in data:
            s.calibration_enabled = bool(data.get('calibration_enabled'))

        if 'text_size' in data:
            ts = str(data.get('text_size') or '').strip().lower()
            if ts not in ('normal', 'large'):
                return jsonify({'error': 'text_size must be normal or large'}), 400
            s.text_size = ts

        if 'high_contrast' in data:
            s.high_contrast = bool(data.get('high_contrast'))

        dr = data.get('data_retention_days', None)
        if dr is not None:
            dr_i = int(dr)
            if dr_i < 7 or dr_i > 3650:
                return jsonify({'error': 'data_retention_days must be between 7 and 3650'}), 400
            s.data_retention_days = dr_i

        if 'preferred_device' in data:
            s.preferred_device = str(data.get('preferred_device') or 'EPOC X').strip()[:50]

        s.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'message': 'Settings saved', 'settings': s.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/patient/change-password', methods=['PUT'])
def patient_change_password():
    data = request.get_json(silent=True) or {}
    national_id = str(data.get('national_id', '') or '').strip()
    current_password = str(data.get('current_password', '') or '')
    new_password = str(data.get('new_password', '') or '')
    if not national_id or not current_password or not new_password:
        return jsonify({'error': 'national_id, current_password, and new_password are required'}), 400

    user       = RegisteredUser.query.filter_by(national_id=national_id).first()
    specialist = Specialist.query.filter_by(national_id=national_id).first()
    admin      = Admin.query.filter_by(national_id=national_id).first()

    target = user  or specialist or admin
    if not target:
        return jsonify({'error': 'User not found'}), 404
    if not check_password_hash(target.password, current_password):
        return jsonify({'error': 'Current password is incorrect'}), 403
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    target.password = generate_password_hash(new_password)
    db.session.commit()
    return jsonify({'message': 'Password updated'}), 200


@app.route('/patient/sessions/export', methods=['GET'])
def patient_export_sessions_csv():
    patient_national_id = str(request.args.get('patient_national_id', '') or '').strip()
    if not patient_national_id:
        return jsonify({'error': 'patient_national_id is required'}), 400

    sessions = EEGSession.query.filter_by(patient_national_id=patient_national_id).order_by(EEGSession.session_id.desc()).limit(1000).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['session_id','patient_national_id','specialist_national_id','model_id','start_time','end_time','detected_word','confidence_level','device','channels','session_status'])
    for s in sessions:
        writer.writerow([
            s.session_id,
            s.patient_national_id,
            s.specialist_national_id or '',
            s.model_id or '',
            s.start_time.isoformat() if s.start_time else '',
            s.end_time.isoformat() if s.end_time else '',
            s.detected_word,
            float(s.confidence_level) if s.confidence_level is not None else '',
            s.device or '',
            s.channels or 14,
            s.session_status,
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename=\"sessions_{patient_national_id}.csv\"'},
    )


# ══════════════════════════════════════════════════════════
# START SERVER
# ══════════════════════════════════════════════════════════


if __name__ == '__main__':

    with app.app_context():
        db.create_all()  #create the database
        ensure_registered_user_verification_columns()
        ensure_admin_specialist_gender_columns()
        ensure_patient_room_numbers()
        ensure_patient_password_column()
        print("📦 Database tables ready")
        print("\n📍 API listening on http://127.0.0.1:5000 (and http://localhost:5000)\n")

    app.run(debug=True, host='0.0.0.0', port=5000)