# Natiqi – Mind-to-Message (Development Branch)

This branch contains the **active development version** of the Natiqi project.  
Features, interfaces, and integrations in this branch are **under development** and may be incomplete or subject to change.

## Project Description
Natiqi is a web-based assistive communication system designed to convert EEG brain signals into meaningful messages for non-verbal users. The platform provides role-based interfaces for recipients (patients), medical specialists, and administrators to support EEG sessions, monitoring, and result review.

## Branch Purpose
- `dev` — Active development and experimentation
- `main` — Stable, submission-ready version (merged later)

This branch reflects ongoing implementation, UI development, and system integration work.

## Current Status
- Role-based dashboards implemented (Admin, Medical Specialist, Recipient)
- Authentication interfaces implemented (Login, Create Account, Password Recovery)
- UI-level EEG session controls and visualizations
- Patient, session, and report management interfaces
- Responsive design with RTL (Arabic) support

> ⚠️ Note: EEG processing, session controls, and analytics are currently implemented at the **interface level** for development and demonstration purposes.

## Technologies Used
- Frontend: React / React Native (Web)
- Backend: Python (planned for EEG decoding and APIs)
- Database: MySQL
- EEG Device: Emotiv EPOC X

## Repository Structure
- `/src` – Application source code
- `/components` – Reusable UI components
- `/screens` – Role-based interfaces
- `/navigation` – Routing and navigation logic
- `/services` – API and data services
- `/assets` – Static assets and images

## Development Notes
- UI components follow a shared design system for consistency
- Role-based access is enforced at the interface level
- No clinical claims are made; the system is intended for academic and research use

## Disclaimer
This branch is intended for **academic development only** and is not suitable for clinical deployment. Features may change before final submission.

