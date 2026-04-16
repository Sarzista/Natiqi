"""
Create Synthetic Data
"""

# ══════════════════════════════════════════════════════════
# SEED DATABASE WITH TEST USERS
# ══════════════════════════════════════════════════════════
from app import app, db
from models import Admin, Specialist, Patient, Model, EEGSession, Alert, SessionLog, RegisteredUser
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta, date

def seed_database():
    """Seeds the database with Natiqi data in the correct dependency order."""
    
    with app.app_context():
        print("🌱 Starting Database Seed...")
        
        # WARNING: This deletes all current data to start fresh
        db.drop_all()
        db.create_all()

        # ---------------------------------------------------------
        # 1. Create Independent Users (Admins & Specialists)
        # ---------------------------------------------------------
        print("   Creating Admins...")
        
        # Admin from PDF [cite: 178]
        admin_laila = Admin(
            national_id=1010101010,
            name='Laila Al-Qahtani',
            email='laila@natiqi.com',
            phone='0501010101',
            password=generate_password_hash('Admin@123'),
            role='admin'
        )

        admin_khalid = Admin(
            national_id = 1020202020,
            name        = 'Khalid Al-Omari',
            email       = 'khalid@natiqi.com',
            phone       = '0501020304',
            password    = generate_password_hash('Admin@123'),
            role        = 'admin',
        )

        db.session.add_all([admin_laila, admin_khalid])
        db.session.commit()


        print("   Creating Specialists...")

        dr_sara = Specialist(
            national_id=2020202020,
            name='Dr. Sara Al-Harbi',
            email='Sara@natiqi.com',
            phone='0502020202',
            password=generate_password_hash('Spec@123'),
            role='specialist'
        )

        # Specialist from PDF [cite: 174]
        dr_omar = Specialist(
            national_id=3030303030,
            name='Omar Al-Mutairi',
            email='omar@natiqi.com',
            phone='0503030303',
            password=generate_password_hash('Spec@123'),
            role='specialist'
        )

        dr_nora = Specialist(
            national_id = 3040404040,
            name        = 'Dr. Nora Al-Zahrani',
            email       = 'nora@natiqi.com',
            phone       = '0503040404',
            password    = generate_password_hash('Spec@123'),
            role        = 'specialist',
        )

        db.session.add_all([dr_sara, dr_omar, dr_nora])
        db.session.commit()

        # ---------------------------------------------------------
        # 2. Create Dependent Entities (Models & Patients)
        # ---------------------------------------------------------
        print("   Creating Models...")

        model_v1 = Model(
            model_name='CNN-BiLSTM',
            model_version='v2.3.1',
            model_accuracy=0.9520,
            model_status='Active',
            training_date=datetime.now() - timedelta(days=5),
            admin_national_id=admin_laila.national_id
        )
  

        model_v2 = Model(
            model_name        = 'CNN-BiLSTM',
            model_version     = 'v2.3.1',
            model_accuracy    = 0.9520,
            model_status      = 'Active',
            training_date     = datetime.now() - timedelta(days=5),
            admin_national_id = admin_laila.national_id,
        )

        db.session.add_all([model_v1, model_v2])
        db.session.commit()


        print("   Creating Patients...")

        patient_sarah = Patient(
            national_id=4040404040,
            name='Sarah Al-Ahmed',
            date_of_birth=datetime(1990, 2, 14),
            gender='Female',
            room_number='101', # Unique room
            device='EPOC X',
            status='Active',
            specialist_national_id=dr_sara.national_id
        )

        patient_fatima = Patient(
            national_id=5050505050,
            name='Fatima Youssef',
            date_of_birth=datetime(1996, 4, 6),
            gender='Female',
            room_number='102',
            device='EPOC X',
            status='Active',
            specialist_national_id=dr_sara.national_id
        )

        patient_hassan = Patient(
            national_id            = 6060606060,
            name                   = 'Hassan Al-Dosari',
            role                   = 'patient',
            date_of_birth          = date(1987, 5, 18),
            gender                 = 'Male',
            room_number            = 'P-1003',
            device                 = 'EPOC X',
            status                 = 'Inactive',
            specialist_national_id = dr_omar.national_id,
        )

        patient_maha = Patient(
            national_id            = 7070707070,
            name                   = 'Maha Al-Salem',
            role                   = 'patient',
            date_of_birth          = date(1994, 3, 12),
            gender                 = 'Female',
            room_number            = 'P-1004',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_omar.national_id,
        )

        patient_yousef = Patient(
            national_id            = 8080808080,
            name                   = 'Yousef Al-Harbi',
            role                   = 'patient',
            date_of_birth          = date(1989, 9, 21),
            gender                 = 'Male',
            room_number            = 'P-1005',
            device                 = 'EPOC X',
            status                 = 'Inactive',
            specialist_national_id = dr_nora.national_id,
        )

        patient_noura = Patient(
            national_id            = 9090909090,
            name                   = 'Noura Al-Jasser',
            role                   = 'patient',
            date_of_birth          = date(1991, 1, 30),
            gender                 = 'Female',
            room_number            = 'P-1006',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_nora.national_id,
        )

        patient_omar = Patient(
            national_id            = 9191919191,
            name                   = 'Omar Al-Otaibi',
            role                   = 'patient',
            date_of_birth          = date(1985, 11, 2),
            gender                 = 'Male',
            room_number            = 'P-1007',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_sara.national_id,
        )

        patient_rania = Patient(
            national_id            = 9292929292,
            name                   = 'Rania Al-Faisal',
            role                   = 'patient',
            date_of_birth          = date(1998, 7, 23),
            gender                 = 'Female',
            room_number            = 'P-1008',
            device                 = 'EPOC X',
            status                 = 'Inactive',
            specialist_national_id = dr_omar.national_id,
        )

        all_patients = [
            patient_sarah, patient_fatima, patient_hassan, patient_maha,
            patient_yousef, patient_noura, patient_omar, patient_rania,
        ]
        db.session.add_all(all_patients)
        db.session.commit()

        # ---------------------------------------------------------
        # 3. Create Sessions (Needs Patient, Specialist, & Model)
        # ---------------------------------------------------------
        print("   Creating Sessions...")

        # Session for Sarah (Water) [cite: 669]
        session_sarah = EEGSession(
            patient_national_id=patient_sarah.national_id,
            specialist_national_id=dr_sara.national_id,
            model_id=model_v1.model_id,
            start_time=datetime.now() - timedelta(minutes=45),
            end_time=datetime.now() - timedelta(minutes=15),
            detected_word='Water (ماء)',
            confidence_level=0.9200,
            device='EPOC X',
            channels=14,
            session_status='Ended'
        )

        # Session for Fatima (Pain/Medicine) [cite: 620]
        session_fatima = EEGSession(
            patient_national_id=patient_fatima.national_id,
            specialist_national_id=dr_sara.national_id,
            model_id=model_v1.model_id,
            start_time=datetime.now() - timedelta(minutes=10),
            end_time=datetime.now(),
            detected_word='Pain (ألم)',
            confidence_level=0.8800,
            device='EPOC X',
            channels=14,
            session_status='Active'
        )

        db.session.add_all([session_sarah, session_fatima])
        db.session.commit() # Commit to get session_id for alerts

       # ---------------------------------------------------------
        # 4. Create EEG SESSIONS  (needs Patient, Specialist, Model)
        # ---------------------------------------------------------
        print("   Creating Sessions...")
        now = datetime.now()

        session_1 = EEGSession(
            patient_national_id    = patient_sarah.national_id,
            specialist_national_id = dr_sara.national_id,
            model_id               = model_v2.model_id,
            start_time             = now - timedelta(minutes=45),
            end_time               = now - timedelta(minutes=15),
            detected_word          = 'Thirst',
            confidence_level       = 0.9200,
            device                 = 'EPOC X',
            channels               = 14,
            session_status         = 'Ended',
        )

        session_2 = EEGSession(
            patient_national_id    = patient_fatima.national_id,
            specialist_national_id = dr_sara.national_id,
            model_id               = model_v2.model_id,
            start_time             = now - timedelta(minutes=30),
            end_time               = now - timedelta(minutes=10),
            detected_word          = 'Medicine',
            confidence_level       = 0.8800,
            device                 = 'EPOC X',
            channels               = 14,
            session_status         = 'Ended',
        )

        session_3 = EEGSession(
            patient_national_id    = patient_hassan.national_id,
            specialist_national_id = dr_omar.national_id,
            model_id               = model_v2.model_id,
            start_time             = now - timedelta(hours=1),
            end_time               = now - timedelta(minutes=40),
            detected_word          = 'Bathroom',
            confidence_level       = 0.8400,
            device                 = 'EPOC X',
            channels               = 14,
            session_status         = 'Ended',
        )

        session_4 = EEGSession(
            patient_national_id    = patient_maha.national_id,
            specialist_national_id = dr_omar.national_id,
            model_id               = model_v2.model_id,
            start_time             = now - timedelta(minutes=20),
            end_time               = now - timedelta(minutes=5),
            detected_word          = 'Hunger',
            confidence_level       = 0.8600,
            device                 = 'EPOC X',
            channels               = 14,
            session_status         = 'Active',
        )

        session_5 = EEGSession(
            patient_national_id    = patient_yousef.national_id,
            specialist_national_id = dr_nora.national_id,
            model_id               = model_v2.model_id,
            start_time             = now - timedelta(hours=2),
            end_time               = now - timedelta(hours=1, minutes=30),
            detected_word          = 'Alarm',
            confidence_level       = 0.7900,
            device                 = 'EPOC X',
            channels               = 14,
            session_status         = 'Ended',
        )

        session_6 = EEGSession(
            patient_national_id    = patient_noura.national_id,
            specialist_national_id = dr_nora.national_id,
            model_id               = model_v2.model_id,
            start_time             = now - timedelta(hours=3),
            end_time               = now - timedelta(hours=2, minutes=30),
            detected_word          = 'Thirst',
            confidence_level       = 0.9100,
            device                 = 'EPOC X',
            channels               = 14,
            session_status         = 'Ended',
        )

        all_sessions = [session_1, session_2, session_3, session_4, session_5, session_6]
        db.session.add_all(all_sessions)
        db.session.commit()


        # ---------------------------------------------------------
        # 5. Create Alerts (Needs Session ID)
        # ---------------------------------------------------------
        print("   Creating Alerts...")

        alert_1 = Alert(
            alert_session_id       = session_1.session_id,
            model_id               = model_v2.model_id,
            patient_national_id    = patient_sarah.national_id,
            specialist_national_id = dr_sara.national_id,
            alert_type             = 'Thirst',
            alert_timestamp        = now - timedelta(minutes=15),
        )

        alert_2 = Alert(
            alert_session_id       = session_2.session_id,
            model_id               = model_v2.model_id,
            patient_national_id    = patient_fatima.national_id,
            specialist_national_id = dr_sara.national_id,
            alert_type             = 'Medicine',
            alert_timestamp        = now - timedelta(minutes=10),
        )

        alert_3 = Alert(
            alert_session_id       = session_3.session_id,
            model_id               = model_v2.model_id,
            patient_national_id    = patient_hassan.national_id,
            specialist_national_id = dr_omar.national_id,
            alert_type             = 'Bathroom',
            alert_timestamp        = now - timedelta(minutes=40),
        )

        alert_4 = Alert(
            alert_session_id       = session_4.session_id,
            model_id               = model_v2.model_id,
            patient_national_id    = patient_maha.national_id,
            specialist_national_id = dr_omar.national_id,
            alert_type             = 'Hunger',
            alert_timestamp        = now - timedelta(minutes=5),
        )

        alert_5 = Alert(
            alert_session_id       = session_5.session_id,
            model_id               = model_v2.model_id,
            patient_national_id    = patient_yousef.national_id,
            specialist_national_id = dr_nora.national_id,
            alert_type             = 'Alarm',
            alert_timestamp        = now - timedelta(hours=1, minutes=30),
        )

        all_alerts = [alert_1, alert_2, alert_3, alert_4, alert_5]
        db.session.add_all(all_alerts)
        db.session.commit()

        # ---------------------------------------------------------
        # 6. Create Logs 
        # ---------------------------------------------------------
        print("   Creating System Logs...")

        log_1 = SessionLog(
            log_id            = 'LOG-1001',
            user_national_id  = dr_sara.national_id,
            user_name         = dr_sara.name,
            role              = 'Specialist',
            event_description = 'Started EEG session for patient Sarah Al-Ahmed',
            status            = 'completed',
            log_timestamp     = now - timedelta(minutes=45),
            device            = 'EPOC X',
            duration          = '30m',
        )

        log_2 = SessionLog(
            log_id            = 'LOG-1002',
            user_national_id  = dr_sara.national_id,
            user_name         = dr_sara.name,
            role              = 'Specialist',
            event_description = 'Detected word: Thirst (92%) for patient Sarah Al-Ahmed',
            status            = 'completed',
            log_timestamp     = now - timedelta(minutes=15),
            device            = 'EPOC X',
            duration          = '1m',
        )

        log_3 = SessionLog(
            log_id            = 'LOG-1003',
            user_national_id  = dr_omar.national_id,
            user_name         = dr_omar.name,
            role              = 'Specialist',
            event_description = 'Alert: Medicine requested by patient Fatima Youssef',
            status            = 'warning',
            log_timestamp     = now - timedelta(minutes=10),
            device            = 'EPOC X',
            duration          = '0s',
        )

        log_4 = SessionLog(
            log_id            = 'LOG-1004',
            user_national_id  = admin_laila.national_id,
            user_name         = admin_laila.name,
            role              = 'Admin',
            event_description = 'Model updated to CNN-BiLSTM v2.3.1',
            status            = 'completed',
            log_timestamp     = now - timedelta(hours=2),
            device            = 'Desktop',
            duration          = '5m',
        )

        log_5 = SessionLog(
            log_id            = 'LOG-1005',
            user_national_id  = admin_laila.national_id,
            user_name         = admin_laila.name,
            role              = 'Admin',
            event_description = 'Nightly model training completed successfully',
            status            = 'completed',
            log_timestamp     = now - timedelta(hours=10),
            device            = 'Desktop',
            duration          = '42m',
        )

        log_6 = SessionLog(
            log_id            = 'LOG-1006',
            user_national_id  = dr_nora.national_id,
            user_name         = dr_nora.name,
            role              = 'Specialist',
            event_description = 'Started EEG session for patient Yousef Al-Harbi',
            status            = 'info',
            log_timestamp     = now - timedelta(hours=2),
            device            = 'EPOC X',
            duration          = '30m',
        )

        log_7 = SessionLog(
            log_id            = 'LOG-1007',
            user_national_id  = admin_khalid.national_id,
            user_name         = admin_khalid.name,
            role              = 'Admin',
            event_description = 'Added new patient: Maha Al-Salem (P-1004)',
            status            = 'completed',
            log_timestamp     = now - timedelta(hours=5),
            device            = 'Desktop',
            duration          = '3m',
        )

        all_logs = [log_1, log_2, log_3, log_4, log_5, log_6, log_7]
        db.session.add_all(all_logs)
        db.session.commit()


if __name__ == "__main__":
    seed_database()
    print("data are added in database")