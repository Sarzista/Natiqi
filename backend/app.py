"""
Natiqi Backend with SQLite Database
Complete version with all tables
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Admin, Specialist, Patient
import os

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


# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════


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

    try:
        n_id = int(national_id)
        
        if role == 'admin':
            user = Admin.query.filter_by(national_id=n_id).first()
        elif role == 'specialist':
            user = Specialist.query.filter_by(national_id=n_id).first()
        
    except ValueError:
        print(f"❌ Invalid national ID format")
        return jsonify({'error': 'Invalid ID format'}), 400
    
    if not user:
        print(f"❌ No {role} found with ID: {national_id}")
        return jsonify({'error': 'Invalid ID or password'}), 401
    
    # Check password
    if not check_password_hash(user.password, password):
        print(f"❌ Wrong password for user: {user.name}")
        return jsonify({'error': 'Invalid ID or password'}), 401
    
    print(f"✅ Login successful: {user.name}")
    return jsonify(user.to_dict()), 200




# ══════════════════════════════════════════════════════════
# START SERVER
# ══════════════════════════════════════════════════════════


if __name__ == '__main__':

    with app.app_context():
        db.create_all()  #create the database
        print("📦 Database tables ready")
        print("\n📍 Running on http://localhost:5000\n")

    app.run(debug=True, port=5000) 