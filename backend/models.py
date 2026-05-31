
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
    gender       = db.Column(db.String(10), nullable=True)
    role         = db.Column(db.String(20), default='admin')
    verification_code = db.Column(db.String(10), nullable=True)
    verification_expires = db.Column(db.DateTime, nullable=True)

    # Relationships
    models       = db.relationship('Model', backref='admin', lazy=True)

    def to_dict(self):
        """Convert to JSON for frontend"""
        return {
            'id': str(self.national_id),
            'name': self.name,
            'email': self.email,
            'role': self.role or 'admin',
            'phone': self.phone or '',
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
    gender       = db.Column(db.String(10), nullable=True)
    role         = db.Column(db.String(20), default='specialist')
    verification_code = db.Column(db.String(10), nullable=True)
    verification_expires = db.Column(db.DateTime, nullable=True)

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
            'phone': self.phone or '',
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
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_code = db.Column(db.String(10), nullable=True)
    verification_expires = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id':          self.national_id,
            'name':        self.name,
            'email':       self.email,
            'phone':       self.phone_num,
            'role':        'RegisteredUser',        
        }


# ──────────────────────────────────────────────
# Patient Settings (per RegisteredUser)
# ──────────────────────────────────────────────
class PatientSettings(db.Model):
    __tablename__ = 'patient_settings'

    user_national_id = db.Column(db.String(20), db.ForeignKey('registered_user.national_id'), primary_key=True, unique=True, nullable=False)

    # Notifications (per decoded word)
    notify_hunger = db.Column(db.Boolean, nullable=False, default=True)
    notify_thirst = db.Column(db.Boolean, nullable=False, default=True)
    notify_alarm = db.Column(db.Boolean, nullable=False, default=True)
    notify_bathroom = db.Column(db.Boolean, nullable=False, default=True)
    notify_medicine = db.Column(db.Boolean, nullable=False, default=True)

    # Safety / decoding behavior
    min_confidence = db.Column(db.Numeric(5, 4), nullable=False, default=0.25)
    # Legacy DB column; no longer exposed in API or UI (bell uses word toggles + min_confidence only).
    require_consecutive = db.Column(db.Integer, nullable=False, default=1)
    # Legacy DB column; no longer exposed in API or UI.
    calibration_enabled = db.Column(db.Boolean, nullable=False, default=False)

    # Accessibility
    text_size = db.Column(db.Enum('normal', 'large', name='patient_text_size'), nullable=False, default='normal')
    high_contrast = db.Column(db.Boolean, nullable=False, default=False)

    # Privacy / data
    data_retention_days = db.Column(db.Integer, nullable=False, default=365)
    # Opt-in: recorded session / EEG data may be used to improve the service (off by default).
    recorded_data_usage_allowed = db.Column(db.Boolean, nullable=False, default=False)

    # Device preferences
    preferred_device = db.Column(db.String(50), nullable=False, default='EPOC X')

    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'user_national_id': self.user_national_id,
            'notify_hunger': bool(self.notify_hunger),
            'notify_thirst': bool(self.notify_thirst),
            'notify_alarm': bool(self.notify_alarm),
            'notify_bathroom': bool(self.notify_bathroom),
            'notify_medicine': bool(self.notify_medicine),
            'min_confidence': float(self.min_confidence),
            'text_size': str(self.text_size),
            'high_contrast': bool(self.high_contrast),
            'data_retention_days': int(self.data_retention_days),
            'recorded_data_usage_allowed': bool(self.recorded_data_usage_allowed),
            'preferred_device': str(self.preferred_device or 'EPOC X'),
            'updated_at': self.updated_at.isoformat() if self.updated_at else '',
        }

# ──────────────────────────────────────────────
# Patient
# ──────────────────────────────────────────────
class Patient(db.Model):
    __tablename__ = 'patient'
    
    national_id           = db.Column(db.String(20), primary_key=True, unique=True, nullable=False)
    name                  = db.Column(db.String(100), nullable=False)
    role                  = db.Column(db.String(20), default='patient')
    password              = db.Column(db.String(255), nullable=True)
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
# EEG Session Event (per decoded word during a session)
# ──────────────────────────────────────────────
class EEGSessionEvent(db.Model):
    __tablename__ = 'eeg_session_event'

    event_id = db.Column(db.Integer, primary_key=True, autoincrement=True, unique=True)
    session_id = db.Column(db.Integer, db.ForeignKey('eeg_session.session_id'), nullable=False, index=True)
    event_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    detected_word = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Numeric(5, 4), nullable=True)

    session = db.relationship('EEGSession', backref=db.backref('events', lazy=True, cascade='all, delete-orphan'))


# ──────────────────────────────────────────────
# Notification (recipient bell UI)
# ──────────────────────────────────────────────
class Notification(db.Model):
    __tablename__ = 'notification'

    notification_id = db.Column(db.Integer, primary_key=True, autoincrement=True, unique=True)
    patient_national_id = db.Column(db.String(20), nullable=False, index=True)
    detected_word = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Numeric(5, 4), nullable=True)
    event_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    seen = db.Column(db.Boolean, nullable=False, default=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        c = float(self.confidence) if self.confidence is not None else None
        return {
            'notification_id': int(self.notification_id),
            'patient_national_id': str(self.patient_national_id),
            'detected_word': str(self.detected_word),
            'confidence': c,
            'event_time': self.event_time.isoformat() if self.event_time else '',
            'seen': bool(self.seen),
        }


# ──────────────────────────────────────────────
# Notification Event (raw per-tick feed; bell eligibility uses word toggles + min_confidence)
# ──────────────────────────────────────────────
class NotificationEvent(db.Model):
    __tablename__ = 'notification_event'

    event_id = db.Column(db.Integer, primary_key=True, autoincrement=True, unique=True)
    patient_national_id = db.Column(db.String(20), nullable=False, index=True)
    detected_word = db.Column(db.String(50), nullable=False)
    confidence = db.Column(db.Numeric(5, 4), nullable=True)
    event_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

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