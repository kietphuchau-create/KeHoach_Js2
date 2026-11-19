# 🏥 MedSched Pro — Smart Healthcare Scheduling & Reception System
## Enterprise Healthcare Appointment & Queue Dispatching Platform

> **Course:** Advanced Software Development Capstone (Java Web Fullstack)  
> **Class:** CD25CT_CLC — **Team:** 02  
> **Supervisor / Instructor:** MSc. Truong Thanh Binh (Faculty of IT & Electronics, ITC)  
> **Final Defense Presentation Video:** [https://www.youtube.com/watch?v=cdJe2Y0I3G0](https://www.youtube.com/watch?v=cdJe2Y0I3G0)  
> **Live Production Web (Vercel):** [https://medsched-lyart.vercel.app](https://medsched-lyart.vercel.app)  
> **Live Backend OpenAPI / Swagger UI (Render):** [https://medsched-zui5.onrender.com/swagger-ui/index.html](https://medsched-zui5.onrender.com/swagger-ui/index.html)  

---

## 👥 Project Team Members (Team 02)

| # | Student ID | Full Name | Primary Roles & Responsibilities |
| :-: | :-: | :--- | :--- |
| 1 | **506250495** | **Chau Tuan Kiet** | **Team Leader / System Architect & Fullstack**<br>Project governance, Hexagonal Clean Architecture design, API orchestration, CI/CD pipeline, and final reporting. |
| 2 | **501250367** | **Nguyen Van Hieu** | **Backend Developer / Cloud Security**<br>Core domain use cases, Spring Security stateless JWT authentication, slot concurrency control, and Cloud deployment. |
| 3 | **501250471** | **Le Thanh Tai** | **Database Developer / Data Modeling**<br>Relational schema design (23 tables normalized to 3NF), JPA query optimization, seed data, and migration integrity. |
| 4 | **501250114** | **Huynh Thi Kim Trang** | **Frontend Developer / UI-UX Engineer**<br>Next.js 15 App Router architecture, responsive UI components, REST client integration, and 4-tier role-based views. |
| 5 | **501250145** | **Nguyen Thi Yen Nhi** | **Business Analyst (BA) / QA & Tester**<br>IEEE 830 / ISO 29148 SRS v2.0 specification, clinic reception workflows, test matrix design, and final defense presentation. |
| 6 | **501250392** | **Tran Nhat Tan** | **AI Integration & MCP Engineer**<br>Spring AI Clinical Triage integration, symptom-to-specialty classification prompt engineering, and Model Context Protocol server. |

---

## 📂 Source Code Structure

```text
Source_code/
├── backend/                  # Java 21 LTS & Spring Boot 3.4.3 Multi-module backend
│   ├── core/                 # Pure domain business logic (Hexagonal inner core - zero Spring dependencies)
│   │   ├── domain/model/     # Domain entities (Appointment, Slot, Doctor, PatientProfile, MedicalRecord)
│   │   ├── port/in/          # Inbound ports / Use case contracts (Book, Cancel, Restore, Schedule, Triage)
│   │   ├── port/out/         # Outbound ports / Gateway contracts (Persistence, AI Client, Notification)
│   │   └── usecase/          # Core implementations (BookAppointmentService, RestoreAppointmentService, etc.)
│   ├── app/                  # Application adapters & infrastructure layer
│   │   ├── adapter/in/web/   # REST Controllers, DTOs, Swagger annotations, Rate limiter
│   │   ├── adapter/out/      # Spring Data JPA repositories, MySQL adapters, Cloudinary storage, AI adapter
│   │   ├── config/           # Security configuration, JWT filter, CORS, Dependency Injection wiring
│   │   └── common/           # Global exception handler, RFC 7807 Problem Details, Error codes
│   └── Dockerfile            # Lightweight multi-stage Docker build optimized for cloud memory constraints (<384MB)
│
├── frontend/                 # Next.js 15 App Router (React 19, TypeScript, Tailwind CSS)
│   ├── src/app/              # 27 application routes (booking, reception, doctor, admin, auth...)
│   ├── src/modules/          # Domain-driven UI components (appointment, doctor, profile, queue)
│   └── src/shared/           # Shared UI primitives, Axios API client, hooks, utilities, formatting
│
├── mcp-server/               # Model Context Protocol (MCP) Server (Node.js) for AI Agent integration
│   ├── tools/                # MCP tools (get_available_slots, book_appointment, clinical_triage)
│   └── server.js             # Standalone MCP server communicating via JSON-RPC
│
├── database/                 # Relational Database scripts (MySQL 8.0)
│   └── medsched_db.sql       # Unified DDL + DML script initializing 23 tables with comprehensive seed data
│
├── api-spec/                 # OpenAPI 3.0 / Swagger JSON specifications
├── monitoring/               # Apache JMeter load and concurrency test scripts (.jmx)
├── docker-compose.yml        # Docker compose orchestrating MySQL, Backend, and Frontend locally
├── start_all.bat             # 1-Click Windows execution script to start Backend + Frontend simultaneously
└── README.md                 # Project documentation (this file)
```

---

## 🏛️ Architecture & Enterprise Engineering Standards

The project strictly fulfills all **5 enterprise-grade requirements** mandated by Instructor Truong Thanh Binh:

1. **Hexagonal / Clean Architecture (Ports & Adapters)**:
   - The `:core` module contains purely POJO business models and use case services, decoupled from frameworks, libraries, or persistence details.
   - The `:app` module adapts infrastructure concerns (Spring Boot, JPA, Security, HTTP, AI APIs).
2. **Automated CI/CD Quality Gate (GitHub Actions)**:
   - Every commit and pull request runs an automated CI pipeline running parallel jobs for backend unit tests (`JUnit 5`) and frontend static typechecking (`TypeScript` + Next.js production build).
3. **Zero-Cost Cloud Deployment (Production Live)**:
   - **Frontend**: Deployed on **Vercel** with global edge CDN caching and automated SSL/TLS certificates.
   - **Backend**: Containerized via multi-stage Docker and hosted on **Render Cloud** with strict heap memory boundaries (`-Xmx384m`).
   - **Database**: High-availability cloud-hosted **MySQL 8.0** on **Aiven Cloud** over encrypted SSL channels.
4. **Resilient Unhappy Path Defense & Concurrency Control**:
   - Double-booking prevention via optimistic locking (CAS pattern) on slot allocations.
   - Daily quota constraints: Maximum 1 pending appointment per patient profile per day; up to 2 appointments for relatives.
   - Post-completion policy: Completed patients can book other doctors on the same day, but cannot re-book the same doctor on that day.
   - Restorative workflow: Ability to restore a mistakenly cancelled appointment (`PATCH /api/appointments/{id}/restore`) if the slot is still open.
5. **Model Context Protocol (MCP) & AI Clinical Triage**:
   - An open-standard MCP server exposing clinic APIs to external AI Agents (such as Claude / Antigravity).
   - Clinical Triage assistant powered by Spring AI with specialized system prompts suggesting appropriate departments 24/7.

---

## 🚀 Local Installation & Quick Start Guide

### Prerequisites
- **Java Development Kit (JDK)**: Version 21 LTS or higher.
- **Node.js**: Version 20 LTS or higher (`pnpm` recommended; `npm` also supported).
- **MySQL / MariaDB**: Version 8.0+ (or XAMPP Control Panel).

---

### Option 1: 1-Click Launch on Windows (Recommended)
1. Ensure MySQL is running on port `3306` and import `database/medsched_db.sql`.
2. Double-click the file:
   ```text
   start_all.bat
   ```
   *(This launches Backend at `localhost:8080`, Frontend at `localhost:3000`, and automatically opens your default browser).*

---

### Option 2: Docker Compose (All-in-One Containerized)
If you have **Docker Desktop** installed:
```bash
docker-compose up -d
```
All containers (MySQL database, Spring Boot application, Next.js frontend) will spin up automatically.

---

### Option 3: Manual Execution by Service

#### 1. Setup Database
- Open **phpMyAdmin** or your preferred MySQL client (Workbench, DBeaver).
- Create database: `medsched_db`.
- Import script: `database/medsched_db.sql`.

#### 2. Start Backend (Spring Boot 3)
```bash
cd backend
./gradlew :app:bootRun
```
*(On Windows command prompt, use `gradlew.bat :app:bootRun`)*.  
- REST API Server: `http://localhost:8080`  
- Interactive OpenAPI / Swagger UI: `http://localhost:8080/swagger-ui/index.html`

#### 3. Start Frontend (Next.js 15)
```bash
cd frontend
pnpm install   # or: npm install
pnpm dev       # or: npm run dev
```
- Open client application: `http://localhost:3000`

#### 4. Start Model Context Protocol (MCP) Server (Optional)
```bash
cd mcp-server
npm install
node server.js
```

---

## 🔑 Demo Credentials (4 Distinct Roles)

Pre-configured accounts with synchronized credentials for comprehensive evaluation:

| Role | Username | Password | Default Portal & Functions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `Admin@123` | `/admin` — System metrics, schedule slot generators, catalog management |
| **Receptionist** | `reception` | `Reception@123` | `/reception` — In-person walk-ins, QR check-in, queue calling, invoicing |
| **Doctor** | `doctor` | `Doctor@123` | `/doctor` — Examination queue, ICD-10 diagnostic entry, prescription dispatch |
| **Patient** | `patient` | `Patient@123` | `/booking`, `/my-appointments` — AI triage booking, digital e-tickets, payment |

---

## 🌐 Live Production References

- **Production Web Application:** [https://medsched-lyart.vercel.app](https://medsched-lyart.vercel.app)
- **Production API & Swagger Docs:** [https://medsched-zui5.onrender.com/swagger-ui/index.html](https://medsched-zui5.onrender.com/swagger-ui/index.html)
- **Final Defense Presentation Video:** [https://www.youtube.com/watch?v=cdJe2Y0I3G0](https://www.youtube.com/watch?v=cdJe2Y0I3G0)
