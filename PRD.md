Of course. This is the most critical step for successful development: creating a definitive, detailed, and actionable master document.

Based on my comprehensive analysis of your entire codebase and the provided Product Requirements Document (PRD), I have synthesized everything into a single, unified "Phase 1 Development Bible."

This document addresses the architectural ambiguities in your code (like the dual backends), consolidates the fragmented testing strategy, and most importantly, provides a granular, feature-by-feature breakdown for **all six user roles** required for your MVP. It follows your directive to include all roles from the start, simplifying complex features into their essential MVP versions.

This is the perfect and complete blueprint you asked for.

---

## **Gharinto Leap: The Definitive Phase 1 Development Blueprint**

**Version:** 2.0
**Status:** Actionable Development Plan

### **1. Executive Summary & Phase 1 Objective**

The Gharinto platform is exceptionally well-conceived, with a clear PRD and a modern technology stack. However, the current codebase shows signs of architectural indecision (two parallel backend implementations) and a fragmented testing approach that must be resolved before proceeding.

**The primary objective of Phase 1 is to build and launch a fully-functional Minimum Viable Platform (MVP) that connects all six key stakeholders and validates the entire operational workflow.**

This phase will prioritize manual operations and clear communication channels over complex automation. We will build the complete "skeleton" of the ecosystem, allowing the first projects to run through the platform with administrative oversight, thereby proving the core value proposition to every user type from day one.

---

### **2. Foundational Architectural Decisions & Cleanup**

Before any new feature development, the following foundational tasks are mandatory to ensure a stable and scalable codebase.

1.  **Standardize the Backend:** The project contains both an Express.js (JavaScript) and an Encore.dev (TypeScript) backend. All testing and execution scripts are pointed at the **Express.js server on port 4000**.
    *   **Decision:** We will officially adopt the **Express.js + PostgreSQL** stack as the single source of truth.
    *   **Action:** All `.ts` files and `encore.app` configurations within the `backend/` directory must be **deleted**. This will remove ambiguity and halve the complexity of the backend codebase.

2.  **Consolidate the Testing Strategy:** The root directory is cluttered with over 20 disparate test scripts. This is unmaintainable.
    *   **Decision:** We will use **Vitest** for all backend unit and integration testing, and **Playwright** for end-to-end (E2E) UI testing.
    *   **Action:**
        *   Create a dedicated `/tests` directory in the root.
        *   Migrate the logic from the most comprehensive test file (`PRODUCTION_API_TEST.cjs`) into a new Vitest suite (`/tests/api.test.ts`).
        *   Create a new Playwright suite for E2E tests (`/tests/e2e.spec.ts`).
        *   **Delete all other test files** (`.js`, `.cjs`, `.mjs`, `.py`, `.html`) from the root directory. Update `package.json` test scripts accordingly.

3.  **Establish a Shared Type Library:** To ensure consistency between the frontend and backend, we will leverage the monorepo structure.
    *   **Action:** Create a new workspace at `/packages/types` and define shared TypeScript interfaces (e.g., `User`, `Project`, `Lead`). Both frontend and backend will import types from this central package.

---

### **3. Phase 1 User Roles: Detailed Specifications & Stories**

This section breaks down the exact features, modules, and user stories to be built for each of the six roles in Phase 1.

#### **Role 1: Super Admin - The System Architect**

The Super Admin's focus is on the platform's structure and security. They are the ultimate authority.

| Module | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **User Management** | As a Super Admin, I want to create, view, and manage **Admin** accounts, so that I can control the internal team that operates the platform. | 1. A "User Management" page lists all system users, filterable by role. <br> 2. A form exists to create a new user and assign the "Admin" role. <br> 3. The Super Admin can activate/deactivate any user account (except their own). |
| **Role & Permission Engine** | As a Super Admin, I want a visual interface to assign permissions to roles, so that I have granular control over the entire platform's security. | 1. An "RBAC" page lists all roles (Admin, PM, Designer, etc.). <br> 2. Clicking a role displays a checklist of all available system permissions (e.g., `projects.create`, `leads.assign`). <br> 3. The Super Admin can check/uncheck permissions and save the changes for any role. |

#### **Role 2: Admin - The Business Operator**

The Admin is the central hub of Phase 1, performing many tasks that will later be automated.

| Module | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Master Dashboard** | As an Admin, I want a dashboard with key metrics, so that I can get a quick overview of platform activity. | 1. The dashboard displays stat cards for: "New Leads," "Pending Partner Verifications," and "Active Projects." <br> 2. Each card is a clickable link to the relevant management page. |
| **Partner Onboarding** | As an Admin, I want to review and approve/reject applications from new Designers, PMs, and Vendors, so that I can build a trusted network. | 1. A "Partner Verification" queue is visible on the dashboard. <br> 2. I can view an applicant's submitted profile details. <br> 3. "Approve" button activates the user's account and sends a welcome email. <br> 4. "Reject" button deactivates the account and sends a rejection email. |
| **Lead Management** | As an Admin, I want to view all incoming leads and manually assign them to a verified Interior Designer, so that I can initiate the project process. | 1. A "Leads" page shows a table of all leads with their status (`New`, `Assigned`, etc.). <br> 2. For a `New` lead, an "Assign" action opens a modal to select a verified Designer (filterable by city). <br> 3. Assigning the lead notifies the Designer and updates the lead's status. |
| **Project Oversight ("God View")** | As an Admin, I want a master view of all projects, so that I can monitor progress and provide support. | 1. A "Projects" page lists all projects. <br> 2. Clicking a project opens a detailed view where I can see everything: the assigned team, all uploaded documents, the full communication log, and the milestone checklist. |

#### **Role 3: Interior Designer (Partner) - The Creative**

The Designer's portal enables them to manage their core business functions.

| Module | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Onboarding & Profile** | As a talented Designer, I want to apply to the platform and, once approved, manage my public-facing profile, so that I can attract clients. | 1. A public "Become a Partner" form collects my professional details (experience, portfolio link, city). <br> 2. After approval, I can log in to my portal and further customize my profile. |
| **Designer Dashboard** | As a Designer, I want a dashboard that shows new leads assigned to me and my active projects, so that I can manage my workload. | 1. The dashboard has two columns: "New Lead Opportunities" and "My Active Projects." <br> 2. New leads show key details and "Accept"/"Reject" buttons. |
| **Lead Conversion** | As a Designer, I want to accept an assigned lead, so that it becomes an official project that I can start working on. | 1. Accepting a lead automatically creates a new project shell in my "Active Projects" list. <br> 2. The Admin and Customer are notified of the project's creation. |
| **Project Workspace (MVP)** | As a Designer, I want a simple workspace for each project to upload documents and communicate, so that I can move the project forward. | 1. Each project has a dedicated page with three tabs: "Milestones," "Documents," and "Communication." <br> 2. **Documents:** I can upload files (PDFs, images, Excel for BOQ). <br> 3. **Communication:** I can post messages visible to the Customer and PM. |

#### **Role 4: Project Manager (Partner) - The Executor**

The PM ensures projects are executed smoothly on the ground.

| Module | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Onboarding & Assignment** | As a PM, I want to apply to the platform, get verified, and be assigned to projects by an Admin, so that I can manage their execution. | 1. Public "Become a Partner" form is available for PMs. <br> 2. Admins can assign a verified PM to any project from the Admin's "Project God View." |
| **PM Dashboard** | As a PM, I want a dashboard listing all my assigned projects with their current status, so that I can prioritize my work. | 1. The dashboard shows a list or card view of my projects. <br> 2. Each project card displays the title, customer, designer, and overall progress percentage. |
| **Milestone Management** | As a PM, I want to update the status of execution-related milestones, so that the project's progress is accurately reflected to everyone. | 1. In a project's "Milestones" tab, I can update the status of tasks like "Civil Work," "Electrical," "Painting" to `Completed`. <br> 2. Updating a milestone's status automatically updates the project's main progress bar. |
| **Manual Procurement** | As a PM, I want to create Purchase Orders (POs) for Vendors based on the Designer's BOQ, so that I can procure project materials. | 1. After reviewing the Designer's uploaded BOQ file, I can access a "Procurement" tab. <br> 2. A simple form allows me to create a PO by selecting a verified Vendor and manually typing in the material items, quantities, and prices. <br> 3. Submitting the form sends a notification to the selected Vendor. |

#### **Role 5: Vendor (Partner) - The Supplier**

The Vendor's portal is a simple interface for receiving and processing orders.

| Module | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Onboarding & Profile** | As a Supplier, I want to register my business on Gharinto and get verified, so that I can become part of the supply chain. | 1. Public "Become a Partner" form is available for Vendors. <br> 2. Admins verify and approve Vendor accounts. <br> 3. Once approved, I can manage my basic company profile. |
| **Order Dashboard** | As a Vendor, I want a dashboard that shows all the Purchase Orders I've received from Gharinto PMs, so that I can process them. | 1. The dashboard lists all my POs with their ID, date, and status. <br> 2. I can click a PO to view the detailed list of items requested. |
| **Order Fulfillment** | As a Vendor, I want to update the status of a PO, so that the Project Manager is kept informed about their order. | 1. Each PO has a simple status dropdown (`Acknowledged`, `Shipped`, `Delivered`). <br> 2. Changing the status sends a real-time notification to the corresponding PM. |

#### **Role 6: Customer (Homeowner) - The Client**

The Customer's portal is built for transparency and peace of mind.

| Module | User Story | Acceptance Criteria |
| :--- | :--- | :--- |
| **Project Dashboard** | As a Customer, I want to log in and see a clear, simple overview of my project's progress, so that I feel informed and confident. | 1. The dashboard shows a prominent progress bar for my project. <br> 2. It clearly displays the current active milestone (e.g., "Flooring Work in Progress"). <br> 3. It highlights if any action is required from me. |
| **Document Vault** | As a Customer, I want to view and download all project-related documents in one place, so that I have a single source of truth. | 1. A "Documents" tab lists all files uploaded by the Designer and Admin (e.g., Agreement, Designs, BOQ PDF). <br> 2. I can click to view or download any file. |
| **Communication Hub** | As a Customer, I want to communicate with my Designer and PM and see a log of all project conversations, so that everything is tracked and transparent. | 1. A "Communication" tab shows a simple, chronological message log. <br> 2. I can see all messages from the team and post my own questions or comments. |
| **Payment Schedule** | As a Customer, I want to view the agreed-upon payment schedule, so that I know when payments are due. | 1. A "Payments" tab shows a list of payment milestones, amounts, and their status (`Upcoming`, `Due`, `Paid`). <br> 2. The Admin will manually update the status to `Paid` in this phase. |

---

### **4. The Phase 1 User Journey: A Day in the Life Scenario**

This scenario demonstrates how all six roles interact within the MVP.

1.  **Onboarding:** **Priya (Designer)**, **Raj (PM)**, and **Classic Furniture (Vendor)** all register on the public site. **Super Admin** has already configured the roles. The **Admin** logs in, sees 3 pending verifications, reviews their profiles, and approves them all.

2.  **Lead Capture & Assignment:** A new lead for the **Sharma Family** comes in. The **Admin** sees it, reviews the requirements, and assigns it to **Priya**.

3.  **Project Initiation:** **Priya (Designer)** receives a notification. She logs in, accepts the lead. A project is created. The **Admin** is notified and assigns **Raj (PM)** to the project.

4.  **Design Phase:** **Priya** creates the designs and a BOQ in an Excel sheet. She uploads these files to the project's "Documents" tab and posts a message: "Designs and BOQ are ready for review."

5.  **Review & Procurement:**
    *   The **Sharma Family (Customer)** logs in, views the documents, and writes back: "We love it! Please proceed."
    *   **Raj (PM)** sees the approval. He reviews the Excel BOQ, goes to the "Procurement" tab, and creates a Purchase Order for **Classic Furniture (Vendor)**, manually entering the required items.

6.  **Fulfillment & Execution:**
    *   **Classic Furniture (Vendor)** gets a notification for a new PO. They log in, view the order, and update the status to "Shipped."
    *   **Raj (PM)** sees the status change. When the materials arrive, he updates the "Material Procurement" milestone to `Completed`.

7.  **Customer Transparency:** The **Sharma Family (Customer)** logs in at night. They see the project progress bar has moved forward because a milestone was completed. They see the entire conversation history and feel completely in the loop, without needing a single phone call.

---

### **5. Conclusion**

This detailed Phase 1 plan establishes the complete ecosystem with all six user roles, focusing on essential workflows and manual operations. By successfully implementing these features, you will have a robust and scalable foundation, perfectly positioned to introduce advanced automation and financial features in subsequent phases. This is the path to building the Gharinto platform "properly and perfectly."