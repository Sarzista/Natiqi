"""
Natiqi Backend with SQLite Database
Complete version with all tables
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Admin, Specialist, Patient, RegisteredUser, EEGSession, Alert, SystemLog
import os
import uuid
from datetime import date

# ══════════════════════════════════════════════════════════
# APP SETUP
# ══════════════════════════════════════════════════════════

app = Flask(__name__)

# SQLite database file location

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'natiqi.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'natiqi-dev-secret'


# Allow requests from Expo
CORS(app, resources={r"/*": {"origins": ["http://localhost:8081", "http://localhost:19006"]}})


# Initialize database
db.init_app(app)

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
    Checks Admin, Specialist, and Patient tables based on role
    """

    data = request.get_json()
    national_id = data.get('national_id', '')
    password    = data.get('password', '')
    role        = data.get('role', '')

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
        print(f"❌ Wrong password for user: {user.name}")
        return jsonify({'error': 'Invalid ID or password'}), 401
    
    print(f"✅ Login successful: {user.name}")
    return jsonify(user.to_dict()), 200

##======    SignUp   ======##
@app.route('/auth/register', methods=['POST'])
def register():
    data = request.get_json()

    # 1. Extract fields from what TypeScript sent
    national_id = data.get('national_id')
    #name        = data.get('name')
    phone_num   = data.get('phone_num')
    email       = data.get('email')
    password    = data.get('password')
    #gender      = data.get('gender')
    

    # 2. Check required fields
    #if not all([national_id, name, email, password, phone_num]):
     #   return jsonify({'error': 'All fields are required'}), 400

    # 3. Check if national_id already exists
    if RegisteredUser.query.filter_by(national_id=national_id).first():
        return jsonify({'error': 'National ID already registered'}), 409

    # 4. Check if email already exists
    if RegisteredUser.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    # 5. Check if phone number already exists
    if RegisteredUser.query.filter_by(phone_num=phone_num).first():
        return jsonify({'error': 'phone_num already registered'}), 409
    
    # 6. Create and save new user
    new_user = RegisteredUser(
        national_id = national_id,         # DB expects Integer
     #   name        = name,
        phone_num   = phone_num,           # DB expects Integer        
        email       = email,
        password    = generate_password_hash(password),  # never store plain text!
     #   gender      = gender,
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': 'Account created successfully!'}), 201



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
                      'role': 'Admin', 'status': 'active', 'nationalId': a.national_id, 'gender': ''})
    for s in specialists:
        users.append({'id': s.national_id, 'name': s.name, 'email': s.email,
                      'role': 'Specialist', 'status': 'active', 'nationalId': s.national_id, 'gender': ''})
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
    temp_password = 'Temp@1234'
    performed_by_name = data.get('performed_by_name', 'Admin')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if not all([national_id, name, email, role]):
        return jsonify({'error': 'All fields are required'}), 400

    try:
        if role == 'Admin':
            if Admin.query.filter_by(national_id=national_id).first():
                return jsonify({'error': 'National ID already exists'}), 409
            if Admin.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 409
            db.session.add(Admin(national_id=national_id, name=name, email=email,
                                 password=generate_password_hash(temp_password)))
        elif role == 'Specialist':
            if Specialist.query.filter_by(national_id=national_id).first():
                return jsonify({'error': 'National ID already exists'}), 409
            if Specialist.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 409
            db.session.add(Specialist(national_id=national_id, name=name, email=email,
                                      password=generate_password_hash(temp_password)))
        elif role == 'Patient':
            if RegisteredUser.query.filter_by(national_id=national_id).first():
                return jsonify({'error': 'National ID already exists'}), 409
            if RegisteredUser.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already exists'}), 409
            db.session.add(RegisteredUser(national_id=national_id, name=name, email=email,
                                          phone_num='0000000000',
                                          password=generate_password_hash(temp_password)))
        else:
            return jsonify({'error': f'Unknown role: {role}'}), 400

        db.session.commit()
        print(f"✅ Admin added {role}: {name}")
        write_system_log(performed_by_name, performed_by_id, f'Added new {role}: {name} — ID: {national_id}', role='Admin')
        return jsonify({'message': f'{role} added successfully'}), 201

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
            'id':         p.national_id,
            'nationalId': p.national_id,
            'name':       p.name,
            'dob':        p.date_of_birth.strftime('%Y-%m-%d') if p.date_of_birth else '',
            'gender':     p.gender or '',
            'device':     p.device or 'Emotiv EPOC X',
            'status':     p.status or 'Active',
        })

    print(f"📋 Returning {len(result)} patients")
    return jsonify(result), 200


##======    Specialist: Add patient   ======##
@app.route('/specialist/patients', methods=['POST'])
def add_patient():
    data          = request.get_json()
    national_id   = data.get('national_id', '').strip()
    name          = data.get('name', '').strip()
    dob           = data.get('dob', '').strip()       # format: YYYY-MM-DD
    gender        = data.get('gender', '').strip()
    specialist_id = data.get('specialist_id', '').strip()
    performed_by_name = data.get('performed_by_name', 'Specialist')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if not all([national_id, name, dob]):
        return jsonify({'error': 'Name, National ID, and DOB are required'}), 400

    if Patient.query.filter_by(national_id=national_id).first():
        return jsonify({'error': 'National ID already registered'}), 409

    try:
        from datetime import date
        dob_parsed = date.fromisoformat(dob)   # validates YYYY-MM-DD format

        new_patient = Patient(
            national_id            = national_id,
            name                   = name,
            date_of_birth          = dob_parsed,
            gender                 = gender,
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

    db.session.delete(patient)
    db.session.commit()
    print(f"🗑️ Deleted patient: {national_id}")
    write_system_log(performed_by_name, performed_by_id, f'Deleted patient: {patient.name} — ID: {national_id}', role='Specialist')
    return jsonify({'message': 'Patient deleted successfully'}), 200

##======    Specialist: Edit patient   ======##
@app.route('/specialist/patients/<national_id>', methods=['PUT'])
def edit_patient(national_id):
    data   = request.get_json()
    name   = data.get('name', '').strip()
    dob    = data.get('dob', '').strip()
    gender = data.get('gender', '').strip()
    performed_by_name = data.get('performed_by_name', 'Specialist')
    performed_by_id   = data.get('performed_by_id', 'unknown')

    if not all([name, dob]):
        return jsonify({'error': 'Name and DOB are required'}), 400
    patient = Patient.query.filter_by(national_id=national_id).first()
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    try:
        from datetime import date
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
    else:
        user = RegisteredUser.query.filter_by(national_id=national_id).first()

    if not user:
        return jsonify({'error': 'User not found'}), 404

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
# START SERVER
# ══════════════════════════════════════════════════════════


if __name__ == '__main__':

    with app.app_context():
        db.create_all()  #create the database
        print("📦 Database tables ready")
        print("\n📍 Running on http://localhost:5000\n")

    app.run(debug=True, port=5000) 