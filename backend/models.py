
"""
Natiqi Database Models
SQLAlchemy models and database tables - ALL TABLES PRESERVED
"""
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# ──────────────────────────────────────────────
# Admin
# ──────────────────────────────────────────────
class Admin(db.Model):
    __tablename__ = 'admin'

    national_id  = db.Column(db.String(20), primary_key=True, unique=True, nullable=False)
    name         = db.Column(db.String(100), nullable=False)
    email        = db.Column(db.String(100), unique=True, nullable=False)
    password     = db.Column(db.String(255), nullable=False)
    phone        = db.Column(db.String(15))
    role         = db.Column(db.String(20), default='admin')

    # Relationships
    models       = db.relationship('Model', backref='admin', lazy=True)

    def to_dict(self):
        """Convert to JSON for frontend"""
        return {
            'id': str(self.national_id),
            'name': self.name,
            'email': self.email,
            'role': self.role or 'admin',
        }


# ──────────────────────────────────────────────
# Specialist
# ──────────────────────────────────────────────
class Specialist(db.Model):
    __tablename__ = 'specialist'

    national_id  = db.Column(db.String(20), primary_key=True, unique=True, nullable=False)
    name         = db.Column(db.String(100), nullable=False)
    email        = db.Column(db.String(100), unique=True, nullable=False)
    password     = db.Column(db.String(255), nullable=False)
    phone        = db.Column(db.String(15))
    role         = db.Column(db.String(20), default='specialist')

    # Relationships
    patients     = db.relationship('Patient',    backref='specialist', lazy=True)
    sessions     = db.relationship('EEGSession', backref='specialist', lazy=True)
    alerts       = db.relationship('Alert',      backref='specialist', lazy=True)

    def to_dict(self):
        """Convert to JSON for frontend"""
        return {
            'id': str(self.national_id),
            'name': self.name,
            'email': self.email,
            'role': self.role or 'specialist',
        }

# ──────────────────────────────────────────────
# Registered User
# ──────────────────────────────────────────────
class RegisteredUser(db.Model):
    __tablename__ = 'registered_user'

    national_id = db.Column(db.String(20), primary_key=True, unique=True, nullable=False)
    name        = db.Column(db.String(100), nullable=True)
    email       = db.Column(db.String(100), nullable=False)
    role        = db.Column(db.String(25), default='RegisteredUser')
    password    = db.Column(db.String(100), nullable=False)
    gender      = db.Column(db.Enum('Male', 'Female', name='registered_user_gender'))
    phone_num   =db.Column(db.String(20), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id':          self.national_id,
            'name':        self.name,
            'email':       self.email,
            'phone':       self.phone_num,
            'role':        'RegisteredUser',        
        }

# ──────────────────────────────────────────────
# Patient
# ──────────────────────────────────────────────
class Patient(db.Model):
    __tablename__ = 'patient'
    
    national_id           = db.Column(db.String(20), primary_key=True, unique=True, nullable=False)
    name                  = db.Column(db.String(100), nullable=False)
    role                  = db.Column(db.String(20), default='patient')
    date_of_birth         = db.Column(db.Date)
    gender                = db.Column(db.String(20))
    room_number           = db.Column(db.String(10), unique=True)
    device                =db.Column(db.String(50), default='EPOC X')
    status                = db.Column(db.String(20), default='stable')
    specialist_national_id = db.Column(db.String(20), db.ForeignKey('specialist.national_id'))

    # Relationships
    sessions              = db.relationship('EEGSession', backref='patient', lazy=True)
    alerts                = db.relationship('Alert',      backref='patient', lazy=True)

    def to_dict(self):
        return {
            'nationalId':  str(self.national_id),                                           
            'name':        self.name,                                                        
            'role':        self.role or 'patient',                                          
            'dateOfBirth': self.date_of_birth.strftime('%Y-%m-%d') if self.date_of_birth else '',
            'gender':      self.gender or '',                                             
            'roomNumber':  self.room_number or '',                                      
            'device':      self.device or 'EPOC X',                                         
            'status':      self.status or 'Active',                                        
        }


# ──────────────────────────────────────────────
# Model  (AI/ML model used in EEG sessions)
# ──────────────────────────────────────────────
class Model(db.Model):
    __tablename__ = 'model'

    model_id           = db.Column(db.Integer, primary_key=True, autoincrement=True, unique=True)
    model_name         = db.Column(db.String(100), nullable=False)
    model_version      = db.Column(db.String(100), nullable=False)
    model_accuracy     = db.Column(db.Numeric(5, 4), nullable=False)
    model_status       = db.Column(db.Enum('Active', 'Inactive', name='model_status'), nullable=False, default='Active')
    training_date     = db.Column(db.DateTime, nullable=False)
    admin_national_id  = db.Column(db.Integer, db.ForeignKey('admin.national_id'), nullable=False)

    # Relationships
    sessions           = db.relationship('EEGSession', backref='model', lazy=True)


# ──────────────────────────────────────────────
# EEG Session
# ──────────────────────────────────────────────
class EEGSession(db.Model):
    __tablename__ = 'eeg_session'

    session_id             = db.Column(db.Integer, primary_key=True, autoincrement=True, unique=True)
    patient_national_id    = db.Column(db.Integer, db.ForeignKey('patient.national_id'),    nullable=False)
    specialist_national_id = db.Column(db.String(20), db.ForeignKey('specialist.national_id'), nullable=True)
    model_id               = db.Column(db.Integer, db.ForeignKey('model.model_id'),         nullable=True)
    start_time             = db.Column(db.DateTime, nullable=False)
    end_time               = db.Column(db.DateTime, nullable=False)
    detected_word          = db.Column(db.String(50), nullable=False)
    confidence_level       = db.Column(db.Numeric(5, 4))
    device                 = db.Column(db.String(50), default='EPOC X')
    channels               = db.Column(db.Integer, default='14')
    session_status         = db.Column(db.Enum('Active', 'Ended', name='session_status'), nullable=False, default='Active')

    # Relationships
    alerts                 = db.relationship('Alert', backref='session', lazy=True)


# ──────────────────────────────────────────────
# Alert
# ──────────────────────────────────────────────
class Alert(db.Model):
    __tablename__ = 'alert'

    alert_id               = db.Column(db.Integer, primary_key=True, autoincrement=True, unique=True)
    alert_session_id       = db.Column(db.Integer, db.ForeignKey('eeg_session.session_id'), nullable=False)
    model_id               = db.Column(db.Integer, db.ForeignKey('model.model_id'),         nullable=True)
    patient_national_id    = db.Column(db.String(20), db.ForeignKey('patient.national_id'),    nullable=False)
    specialist_national_id = db.Column(db.String(20), db.ForeignKey('specialist.national_id'), nullable=False)
    alert_type             = db.Column(db.Enum('Bathroom', 'Hunger', 'Thirst', 'Medicine', 'Alarm', name='alert_type'), nullable=False)
    alert_timestamp        = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)




# ──────────────────────────────────────────────
# Session Logs
# ──────────────────────────────────────────────
class SessionLog(db.Model):
    __tablename__ = 'session_log'

    log_id            = db.Column(db.String(100), primary_key=True, unique=True)
    user_national_id = db.Column(db.String(20), nullable=True)
    user_name         = db.Column(db.String(100), nullable=False)
    role              = db.Column(db.Enum('Patient', 'Specialist', 'Admin', name='log_role'), nullable=False)
    event_description = db.Column(db.Text, nullable=False)
    status            = db.Column(db.Enum('completed', 'info', 'warning', name='log_status'), nullable=False)
    log_timestamp     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    device            = db.Column(db.String(50), default='EPOC X')
    duration          = db.Column(db.String(100))


# ──────────────────────────────────────────────
# System Log  (admin/specialist management actions)
# ──────────────────────────────────────────────
class SystemLog(db.Model):
    __tablename__ = 'system_log'

    log_id           = db.Column(db.String(40), primary_key=True)
    user_name        = db.Column(db.String(100), nullable=False)
    user_national_id = db.Column(db.String(20),  nullable=False)
    role             = db.Column(db.String(20), nullable=True)
    event            = db.Column(db.Text,         nullable=False)
    log_timestamp    = db.Column(db.DateTime,     nullable=False, default=datetime.utcnow)