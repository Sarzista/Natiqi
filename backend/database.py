"""
Create Synthetic Data
"""

# ══════════════════════════════════════════════════════════
# SEED DATABASE WITH TEST USERS
# ══════════════════════════════════════════════════════════
from app import app, db, generate_password_hash
from models import Admin, Specialist, Patient, Model, EEGSession, Alert, RegisteredUser
from datetime import datetime, timedelta, date

def seed_database():
    """Seeds the database with Natiqi data in the correct dependency order."""
    
    with app.app_context():
        print("Starting Database Seed...")
        
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
            gender='Female',
            password=generate_password_hash('Admin@123'),
            role='admin'
        )

        admin_khalid = Admin(
            national_id = 1020202020,
            name        = 'Khalid Al-Omari',
            email       = 'khalid@natiqi.com',
            phone       = '0501020304',
            gender      = 'Male',
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
            gender='Female',
            password=generate_password_hash('Spec@123'),
            role='specialist'
        )

        # Specialist from PDF [cite: 174]
        dr_omar = Specialist(
            national_id=3030303030,
            name='Omar Al-Mutairi',
            email='omar@natiqi.com',
            phone='0503030303',
            gender= 'Male',
            password=generate_password_hash('Spec@123'),
            role='specialist'
        )

        dr_nora = Specialist(
            national_id = 3040404040,
            name        = 'Dr. Nora Al-Zahrani',
            email       = 'nora@natiqi.com',
            phone       = '0503040404',
            gender='Female',
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
            password=generate_password_hash('user@123'),
            date_of_birth=datetime(1990, 2, 14),
            gender='Female',
            room_number='4281',
            device='EPOC X',
            status='Active',
            specialist_national_id=dr_sara.national_id
        )

        patient_fatima = Patient(
            national_id=5050505050,
            name='Fatima Youssef',
            password=generate_password_hash('user@123'),
            date_of_birth=datetime(1996, 4, 6),
            gender='Female',
            room_number='9156',
            device='EPOC X',
            status='Active',
            specialist_national_id=dr_sara.national_id
        )

        patient_hassan = Patient(
            national_id            = 6060606060,
            name                   = 'Hassan Al-Dosari',
            role                   = 'patient',
            password               = generate_password_hash('user@123'),
            date_of_birth          = date(1987, 5, 18),
            gender                 = 'Male',
            room_number            = '6734',
            device                 = 'EPOC X',
            status                 = 'Inactive',
            specialist_national_id = dr_omar.national_id,
        )

        patient_maha = Patient(
            national_id            = 7070707070,
            name                   = 'Maha Al-Salem',
            role                   = 'patient',
            password               = generate_password_hash('user@123'),
            date_of_birth          = date(1994, 3, 12),
            gender                 = 'Female',
            room_number            = '8802',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_omar.national_id,
        )

        patient_yousef = Patient(
            national_id            = 8080808080,
            name                   = 'Yousef Al-Harbi',
            role                   = 'patient',
            password               = generate_password_hash('user@123'),
            date_of_birth          = date(1989, 9, 21),
            gender                 = 'Male',
            room_number            = '3091',
            device                 = 'EPOC X',
            status                 = 'Inactive',
            specialist_national_id = dr_nora.national_id,
        )

        patient_noura = Patient(
            national_id            = 9090909090,
            name                   = 'Noura Al-Jasser',
            role                   = 'patient',
            password               = generate_password_hash('user@123'),
            date_of_birth          = date(1991, 1, 30),
            gender                 = 'Female',
            room_number            = '7455',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_nora.national_id,
        )

        patient_omar = Patient(
            national_id            = 9191919191,
            name                   = 'Omar Al-Otaibi',
            role                   = 'patient',
            password               = generate_password_hash('user@123'),
            date_of_birth          = date(1985, 11, 2),
            gender                 = 'Male',
            room_number            = '5620',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_sara.national_id,
        )

        patient_rania = Patient(
            national_id            = 9292929292,
            name                   = 'Rania Al-Faisal',
            role                   = 'patient',
            password               = generate_password_hash('user@123'),
            date_of_birth          = date(1998, 7, 23),
            gender                 = 'Female',
            room_number            = '1984',
            device                 = 'EPOC X',
            status                 = 'Inactive',
            specialist_national_id = dr_omar.national_id,
        )

        # Demo patient for specialist Omar (3030303030); password 123 for app testing
        patient_1616 = Patient(
            national_id            = 1616161616,
            name                   = 'Ayla Al-Naimi',
            role                   = 'patient',
            password               = generate_password_hash('123'),
            date_of_birth          = date(2000, 1, 16),
            gender                 = 'Female',
            room_number            = '1616',
            device                 = 'EPOC X',
            status                 = 'Active',
            specialist_national_id = dr_omar.national_id,
        )

        all_patients = [
            patient_sarah, patient_fatima, patient_hassan, patient_maha,
            patient_yousef, patient_noura, patient_omar, patient_rania, patient_1616,
        ]
        db.session.add_all(all_patients)
        db.session.commit()

        # ---------------------------------------------------------
        # 3. Create Sessions (Needs Patient, Specialist, & Model)
        # ---------------------------------------------------------
        # print("   Creating Sessions...")

        # # Session for Sarah (Water) [cite: 669]
        # session_sarah = EEGSession(
        #     patient_national_id=patient_sarah.national_id,
        #     specialist_national_id=dr_sara.national_id,
        #     model_id=model_v1.model_id,
        #     start_time=datetime.now() - timedelta(minutes=45),
        #     end_time=datetime.now() - timedelta(minutes=15),
        #     detected_word='Water (ماء)',
        #     confidence_level=0.9200,
        #     device='EPOC X',
        #     channels=14,
        #     session_status='Ended'
        # )

        # # Session for Fatima (Pain/Medicine) [cite: 620]
        # session_fatima = EEGSession(
        #     patient_national_id=patient_fatima.national_id,
        #     specialist_national_id=dr_sara.national_id,
        #     model_id=model_v1.model_id,
        #     start_time=datetime.now() - timedelta(minutes=10),
        #     end_time=datetime.now(),
        #     detected_word='Pain (ألم)',
        #     confidence_level=0.8800,
        #     device='EPOC X',
        #     channels=14,
        #     session_status='Active'
        # )

        # db.session.add_all([session_sarah, session_fatima])
        # db.session.commit() # Commit to get session_id for alerts

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

        # session_6 = EEGSession(
        #     patient_national_id    = patient_noura.national_id,
        #     specialist_national_id = dr_nora.national_id,
        #     model_id               = model_v2.model_id,
        #     start_time             = now - timedelta(hours=3),
        #     end_time               = now - timedelta(hours=2, minutes=30),
        #     detected_word          = 'Thirst',
        #     confidence_level       = 0.9100,
        #     device                 = 'EPOC X',
        #     channels               = 14,
        #     session_status         = 'Ended',
        # )

        # session_7 = EEGSession(
        #     patient_national_id    = patient_1616.national_id,
        #     specialist_national_id = dr_omar.national_id,
        #     model_id               = model_v2.model_id,
        #     start_time             = now - timedelta(hours=2),
        #     end_time               = now - timedelta(hours=1, minutes=30),
        #     detected_word          = 'Thirst',
        #     confidence_level       = 0.8900,
        #     device                 = 'EPOC X',
        #     channels               = 14,
        #     session_status         = 'Ended',
        # )

        # session_8 = EEGSession(
        #     patient_national_id    = patient_1616.national_id,
        #     specialist_national_id = dr_omar.national_id,
        #     model_id               = model_v2.model_id,
        #     start_time             = now - timedelta(minutes=50),
        #     end_time               = now - timedelta(minutes=20),
        #     detected_word          = 'Medicine',
        #     confidence_level       = 0.8700,
        #     device                 = 'EPOC X',
        #     channels               = 14,
        #     session_status         = 'Ended',
        # )

        all_sessions = [session_1, session_2, session_3, session_4, session_5]
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



if __name__ == "__main__":
    seed_database()
    print("data are added in database")