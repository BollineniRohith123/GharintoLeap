Give me the perfect prd for me for this perfeclty and clearly - This document, Gharinto Platform - Comprehensive Product Requirements Document (PRD) V1.0, is the definitive and final specification for the development of your revolutionary home interiors marketplace. It meticulously combines all previously detailed requirements from PRD V3.0 and the advanced CRM and Voice CRM integrations from PRD V4.0, while also incorporating all new specific client feedback. This PRD outlines a robust, end-to-end, and perfectly integrated system, ready for implementation.

GHARINTO PLATFORM - COMPREHENSIVE PRODUCT REQUIREMENTS DOCUMENT (PRD) V1.0
ðŸ“‹ EXECUTIVE SUMMARY

Version: 1.0 (Official Launch Specification)
Date: August 7, 2025
Status: Final for Development
Author: AI Assistant (Consolidated & Enhanced)

1.1 Platform Vision

Gharinto is envisioned as a revolutionary, technology-driven, three-sided marketplace that will redefine India's fragmented home interiors and renovation industry. Positioned as a direct competitor to premium players like Livspace and HomeLane, Gharinto differentiates itself by emphasizing unparalleled transparency, stringent quality assurance, and end-to-end operational efficiency across its unified ecosystem. Our core promise is to deliver dream home transformations with predictable costs, timelines, and superior quality, fostering trust and satisfaction for all stakeholders. The platform will adopt a sophisticated, modern aesthetic with a pale green, black, and green theme, drawing inspiration from high-end interior design aesthetics (client reference: Instagram pictures for color palette).

1.2 Market Opportunity

The Indian home interiors market presents a $40+ billion opportunity, currently plagued by systemic inefficiencies:

Cost Overruns: Projects frequently exceed budget by an average of 35%.

Project Delays: Timelines are missed by an average of 45%.

Quality Inconsistencies: Leading to approximately 78% customer dissatisfaction.

Communication Breakdowns: Resulting in up to 92% project conflicts.

1.3 Target Market Segments

Gharinto will serve and empower four key market segments:

Value-conscious Homeowners: Seeking high-quality, transparent, and affordable interior solutions.

Professional Interior Designers (Partners): Requiring robust business infrastructure, steady lead flow, and streamlined project/financial management.

Material Suppliers/Manufacturers (Vendors): Desiring predictable demand, efficient order management, and simplified payment processing.

Real Estate Developers (Builders): Looking for integrated solutions to offer fully-furnished, ready-to-move-in properties, accelerating sales and enhancing property value.

ðŸ—ï¸ PLATFORM ARCHITECTURE & USER ROLES

Gharinto's architecture is built on a modular, role-based system, ensuring each user has a tailored experience with appropriate access levels. A critical enhancement for V1.0 is the dynamic configuration of all user permissions (RBAC) and sidebar menus directly from the database, providing unparalleled flexibility, scalability, and granular security control. No static data will be present in the frontend for these configurations.

2.1 Enhanced User Hierarchy
ðŸ”‘ SUPER ADMIN (ENHANCED)

Role: The ultimate authority on the Gharinto platform, embodying complete oversight and control over all system-level configurations, user management, and global operational policies.

Permissions:

Comprehensive User Management: Create, manage, and delete all user accounts across the platform hierarchy (Admin/Operations Team, Project Managers, Interior Designers, Customers, Vendors, and other Employees).

Global Configuration: Configure all platform-wide settings, feature flags, global policies, and regional parameters (e.g., city-specific pricing, localized content rules) directly from the database.

Financial & Commission Oversight: Monitor all financial transactions, dynamically configure commission structures (e.g., tiered designer commission, PM commission, platform fee), manage complex tax configurations (e.g., GST rates by region/city), and oversee payout schedules and processing.

System Health & Security: Real-time monitoring of server performance, API response times, error rates, database health, security threats, and manage security policies (e.g., MFA requirements, password policies, comprehensive audit logs).

Override Capabilities: Possess the ability to override any system decisions, restrictions, or directly assign/reassign leads and projects across any role or region.

Employee Management: Full lifecycle management for Employee accounts, including adding/removing, assigning dynamically configured roles, setting precise regional and departmental access, tracking performance and activities, and managing onboarding/offboarding processes.

Comprehensive Analytics: Access to all platform analytics, detailed reports, and dashboards for strategic, data-driven decision-making, including aggregated and granular views of all business metrics.

CRM System Management (NEW): Centralized control over the integrated CRM systems (LeadPro CRM, Perfex CRM with LeadPilot AI) including configuration settings, user management, integration parameters, and comprehensive CRM analytics. Configuration of automated lead routing, follow-up sequences, and escalation rules within the CRM.

Dashboard Components:

Platform Overview: Features real-time analytics dashboard displaying Total GMV, Revenue metrics (with filters for region, time, service type), User Growth & Engagement (MAU, retention with cohort analysis), Project Completion Rates (overall and segmented by region/PM/Designer with predictive analytics), Geographic Performance Heatmaps (visualizing project density, lead origin, revenue across cities with drill-down). Also includes Commission & Profit Analysis, Partner Acquisition Funnel, Lead Performance by Partner (leads received, conversion rate, CSAT per designer), Customer Engagement by Partner (customers per designer, project statuses), Vendor Performance by Category (order volume, on-time delivery, quality scores per material category, with comparison across multiple vendors for the same product type).

User & Role Management: Dynamic RBAC configuration interface, comprehensive employee management, robust partner management, and detailed customer management.

Financial Control: Advanced revenue management, in-depth financial analytics, dynamic commission structures, and real-time tax configuration.

System Configuration: Global platform settings, dynamic feature flags, regional settings customization, API integration management, and advanced security management.

Compliance & Legal: Tools for regulatory compliance, comprehensive audit reporting, and legal document management.

CRM System Management (NEW): Provides a centralized dashboard for CRM configuration and administration, including integration monitoring and CRM-specific analytics.

ðŸ‘¥ ADMIN/OPERATIONS TEAM (ENHANCED)

Role: Manages the day-to-day operations of the platform, executing tasks within the global parameters set by the Super Admin. Focuses on user support, lead conversion, project monitoring, and financial approvals.

Permissions:

User Onboarding & Verification: Manages the onboarding, detailed verification, and status updates for Designers, Vendors, and Customers.

Lead Assignment & Management: Oversees lead acquisition across channels, utilizes the advanced Lead Segregation Engine for intelligent routing, and has capabilities for manual assignment/reassignment of leads.

Project Oversight & Intervention: Monitors ongoing projects in real-time, identifies risks (delays, budget, quality), and intervenes to resolve issues or escalate to PMs.

Financial Monitoring & Approval: Reviews and approves transactions (e.g., vendor payouts, designer withdrawals) and monitors financial reports within defined limits.

Content Management: Manages and updates content for the public website, design galleries, and help center articles.

Dashboard Components:

Lead Management Engine (ENHANCED): Features multi-channel lead capture, sophisticated lead scoring and qualification, an advanced Lead Segregation/Distribution Engine (with full CRM functionality) including AI-powered matching, and seamless Voice Calls CRM API Integration (e.g., Perfex CRM + LeadPilot AI) for call logging, automated voice calls, and intelligent lead engagement. Includes comprehensive lead status tracking with activity logging and nurturing workflows. Offers detailed call analytics (volume, conversion, duration, agent performance) and integrated VoIP for click-to-call.

Project Oversight: Provides real-time project status tracking (with drill-down), automated risk identification and alerts (e.g., for delays, budget overruns), performance benchmarking, customer satisfaction monitoring, and high-level resource utilization analysis. Includes city-wise project segregation allowing managers to focus on regional operations.

Communication Hub: Offers robust internal team messaging with channels and direct messages, system-wide and targeted announcements, and advanced escalation management with SLA tracking. Includes a centralized knowledge base.

ðŸ‘·â€â™‚ï¸ PROJECT MANAGER (ENHANCED)

Role: Responsible for the end-to-end execution of assigned interior design projects, ensuring they are completed on-time, within budget, and to the highest quality standards.

Permissions:

Multiple Project Management: Manage a portfolio of assigned projects, track their granular progress, and oversee on-site teams and resources.

Timeline & Budget Tracking: Implements and updates interactive Gantt charts, monitors project budgets vs. actual spending in real-time, and manages change orders and budget revisions.

Procurement Coordination: Oversees material procurement, raises and tracks purchase orders, and coordinates logistics with vendors and the Procurement Team.

Quality Control Oversight: Conducts and logs detailed quality inspections, tracks defects with photo documentation, and ensures strict adherence to quality standards.

Team Communication & Resource Allocation: Facilitates internal team communication, dynamically allocates and schedules resources (labor, equipment, tools), and manages their availability and conflicts. Also uses integrated CRM for client communication.

Dashboard Components:

Project Execution: Includes interactive timeline management with Gantt charts (showing dependencies and critical path analysis), real-time budget control (with cost prediction and PO integration), and comprehensive task management (with status synchronization and milestone tracking).

Resource Coordination: Features detailed team management (with skill-based assignment and performance tracking), and material management (monitoring requirements, vendor coordination, and delivery tracking).

Quality Control: Offers robust quality assurance workflows with digital inspection checklists (customizable templates), photo documentation requirements for site work, defect tracking and resolution, and automated quality scoring.

Client Communication Management (CRM Integration): Direct access to CRM communication history for clients, click-to-call functionality, automated call logging, and workflow automation for follow-ups.

ðŸŽ¨ INTERIOR DESIGNER (PARTNER) (ENHANCED)

Role: Focuses on creative design, engaging with clients, and efficiently managing their design business within the Gharinto ecosystem.

Permissions:

Lead Acquisition & Management: Browses and acquires new project leads from the Lead Marketplace using platform credits, with advanced filtering and performance analytics.

Design Creation & BOQ Generation: Utilizes integrated tools to create 2D/3D designs, visualize materials, generate accurate Bills of Quantities (BOQs), and craft professional client proposals.

Material Sourcing & Ordering: Accesses the curated Material Catalog to select materials, initiate purchase requests, and track material details.

Client Communication & Project Tracking: Communicates directly with clients, obtains design approvals, and tracks project progress for their assigned projects, with integrated feedback collection.

Financial Management (Wallet, Earnings): Manages their digital wallet, tracks earnings from completed milestones, and processes withdrawals, with comprehensive financial reporting.

Dashboard Components:

Business Management: Includes an advanced Lead Marketplace (with filters, credit management, conversion tracking, and analytics enhanced by AI-powered lead qualification scores and automated follow-up via LeadPilot AI), a full-featured Digital Wallet (with credit purchase, earnings tracking, withdrawals, and tax management), and comprehensive Business Analytics (KPIs, trends, insights).

Design Tools: Features a powerful BOQ Generator (with material catalog integration, automated pricing, margin optimization, and proposal generation), and an intuitive Design Studio (for design management, material visualization, and client collaboration with version control).

Client Management: Provides robust project tracking (with status indicators and progress reports), a dedicated client communication hub (for revisions, updates, feedback, enhanced by CRM communication history), and a structured design approval workflow.

ðŸ  HOMEOWNER (CUSTOMER) (ENHANCED)

Role: Actively engages with their interior design project, monitoring progress, providing essential feedback, and managing payments through a fully transparent and user-friendly portal.

Permissions:

Project Progress Tracking: Views real-time project status updates, detailed timelines, and milestone completion.

Design Approval & Feedback: Accesses 2D/3D designs for immersive review, provides direct feedback, and formally approves design changes.

Payment Processing: Views clear payment schedules, accesses all invoices, and makes secure online payments through integrated gateways.

Communication with Team: Engages in direct, real-time messaging with their assigned Project Manager and Interior Designer, with communication history also synced via CRM.

Document Access & Warranty: Accesses all project contracts, design files, material specifications, quality reports, and digital warranty certificates from a centralized, secure vault.

Dashboard Components:

Project Monitoring: Features a dynamic Progress Dashboard (with visual progress tracking, milestone status, activity feed, and real-time photo/video updates), and comprehensive Financial Management (payment schedule, invoice management, secure payment processing, refund management, and tax documentation).

Communication & Collaboration: Includes a unified Communication Hub (multi-channel communication options including call, email, SMS, and in-app messages, with complete history tracking synced via CRM; also provides automated responses and appointment scheduling).

Document Management: Provides a secure Digital Vault (centralized access to all project documents, including contracts, design files, material specifications, and warranty management with version control).

ðŸ“¦ VENDOR/SUPPLIER (ENHANCED)

Role: Manages their product catalog, monitors inventory levels, and efficiently fulfills orders placed by Gharinto's procurement team or designers.

Permissions:

Product Catalog Management: Adds, edits, and manages their complete product listings, including detailed specifications, images, and pricing strategies.

Inventory Tracking & Alerts: Updates real-time stock levels for all their products, configures and receives low-stock alerts, and manages product availability.

Order Fulfillment & Shipping: Receives and processes Purchase Orders (POs) from Gharinto, updates order statuses, and coordinates shipping and delivery logistics.

Financial Tracking & Settlements: Monitors payments received from Gharinto, accesses detailed order history, and views financial settlements and tax documentation.

Performance Analytics: Accesses basic analytics on their product sales, order fulfillment performance, and on-time delivery rates.

Dashboard Components:

Inventory Management: Features Real-time Stock Tracking (with automated updates, low-stock/reordering alerts, multi-location inventory, and batch/expiry tracking) and comprehensive Catalog Management (for product listing, pricing, image uploads, categorization, and SEO).

Order Management: Provides robust order processing (PO reception, status tracking, shipping coordination, and returns management), with communication streamlined through CRM integration.

Financial Management: Includes detailed payment tracking, automated invoice generation, transparent settlement processing, and comprehensive financial reporting.

ðŸ”§ EMPLOYEE (ENHANCED)

Role: Support staff with limited, task-specific access, managed and granted by the Super Admin. These roles enable granular delegation of duties while maintaining control.

Permissions:

Limited Access: Permissions are highly configurable by the Super Admin, dynamically fetched from the database, based on their specific job function (e.g., Finance Assistant, Lead Qualifier, Site Supervisor Assistant, Regional Support).

Task-Specific Functionalities: Access granted only to the modules, data, and actions relevant to their assigned job function (e.g., a "Lead Qualifier" would have a restricted view of Lead Management, focusing only on qualification fields and lead status updates, with integrated CRM tools for follow-up).

Reporting: Ability to view and generate reports specific to their domain and assigned data sets (e.g., sales reports for their region).

Regional/Departmental Access: Access can be restricted to specific cities or departments, ensuring data segregation.

Dashboard Components:

Role-Specific Views: Employees log into a customized interface (potentially a subset of Admin or PM dashboard) with only their permitted sections and menu items (dynamically loaded from DB) visible.

Task-focused Design: Interface optimized for efficient completion of specific employee tasks, potentially incorporating workflow automation and guided processes, including CRM-driven tasks.

Reporting: Access to relevant, role-specific reports with data visualization and export capabilities.

ðŸ“‹ DETAILED FUNCTIONAL REQUIREMENTS
3.1 SUPER ADMIN DASHBOARD (ENHANCED)
3.1.1 Platform Overview

Real-time Analytics Dashboard:

Total GMV & Revenue: Live tracking of Gross Merchandise Value and platform revenue with filters by region (e.g., Mumbai, Bangalore, Hyderabad, dynamically loaded from DB), time period, and service type. Drill-down functionality from aggregate to detailed views.

User Growth & Engagement: Trends for Monthly Active Users (MAU), new registrations (customer, designer, vendor, employee), and user retention rates with cohort analysis to identify growth patterns.

Project Completion Rates: Overall and segmented by project type, region, and assigned PM/Designer with predictive analytics for potential delays.

Geographic Performance Heatmaps: Interactive visual representation of project density, lead origin, and revenue distribution across cities with drill-down capabilities to specific localities within a city.

Commission & Profit Analysis: Detailed breakdown of platform earnings from commissions, profit margins per project/service, and cost analysis with trend visualization and variance analysis.

Partner Acquisition Funnel: Tracking of new Interior Partners and Vendors/Factories onboarding progress with conversion metrics (e.g., signup to verified).

Lead Performance by Partner: Detailed metrics on how many leads each designer/partner is receiving, their individual lead conversion rates, and customer satisfaction ratings for their projects, provided seamlessly. This allows for direct performance review of individual partners.

Customer Engagement by Partner: Clear information on how many customers are associated with each designer/partner and their current project statuses, enabling comprehensive partner-customer relationship management insights.

Vendor Performance by Category: Metrics like order volume, on-time delivery rate, quality scores, and defect rates for different material categories and individual vendors, with comparative analysis of multiple vendors (3-4 or more) for the same product type.

System Health Monitoring:

Server Performance: Real-time CPU usage, memory usage, disk space, network traffic with historical trends and customizable thresholds for alerts.

API Response Times: Average, percentile-based response times, peak loads, and error rates with endpoint-specific breakdowns for performance diagnostics.

Database Performance: Query performance monitoring, connection pool usage, slow query identification, and automated indexing recommendations.

Error Rates: System errors by category, frequency, severity with automated alerting and root cause analysis tools.

Security Threat Monitoring: Real-time threat detection, suspicious activity logs (e.g., failed login attempts, unusual data access), and automatically blocked attempts.

3.1.2 User & Role Management

Dynamic RBAC (Role-Based Access Control):

Role Creation & Configuration: Super Admin can create new roles (e.g., 'Senior Designer', 'Junior PM', 'Regional Sales Lead') and define precise permissions for each role dynamically from the database with a user-friendly interface.

Permission Assignment: Assign specific permissions (e.g., MANAGE_PROJECTS, VIEW_FINANCIALS_BY_REGION, EDIT_CATALOG) to roles with granular control down to individual API endpoints or UI elements.

User-to-Role Assignment: Assign users to defined roles with bulk operations capability (e.g., assign all new hires to 'Trainee' role).

Hierarchical Permissions: Implement a hierarchy where higher roles implicitly inherit permissions or can explicitly grant/revoke them for lower roles.

Permission Templates: Create and save permission templates for common role configurations to streamline setup.

Dynamic Sidebar Menu Configuration:

Menu Item Management: Super Admin can configure which menu items appear in each role's sidebar, and define their order, grouping (e.g., collapsible sections), and icons dynamically from the database via an intuitive drag-and-drop interface.

Visibility Control: Link menu item visibility to specific permissions, so only users with the required permission see certain menu items, ensuring compliance and focused workflows.

No Static Data: All user roles, permissions, and sidebar menu structures (including text, icons, and routing) will be stored in and fetched dynamically from the database, eliminating hardcoded values in the frontend. This applies to all roles (Super Admin, Admin, PM, Designer, Customer, Vendor, Employee).

Employee Management:

Employee Lifecycle Management: Complete employee lifecycle management from onboarding to offboarding with automated workflows for approvals and notifications.

Role Assignment: Detailed role assignment (dynamically from DB) with clear permission inheritance and visibility of inherited permissions.

Regional Access: Set regional and departmental access for employees (e.g., a PM assigned only to Mumbai projects; a sales associate only sees leads in Delhi).

Performance Tracking: Track employee performance and activities via audit logs with customizable performance metrics and dashboards for managers.

Access Control: Configure granular permission levels based on their specific job function, including time-based access or multi-factor authentication requirements.

Bulk Operations: Bulk employee creation, role assignment, and access configuration for efficient administration.

Partner Management:

Bulk Partner Onboarding: Streamlined process for onboarding multiple designers and vendors simultaneously with CSV import and validation tools.

Performance Tier Management: Define and assign performance tiers for partners (e.g., 'Gold', 'Silver', 'Bronze'), dynamically impacting commission rates or lead priority based on performance criteria.

Commission Structure Configuration: Dynamically adjust commission rates for designers and PMs, and platform fees with historical tracking of changes.

Partner Verification & Approval: Tools for detailed verification of new partners (e.g., document upload, background checks) and approval workflows with automated notifications.

Suspension and Termination: Controls for managing non-compliant or underperforming partners with automated notifications and data archiving.

Customer Management:

Customer Segmentation & Analysis: Group customers based on project value, activity, demographics, or design preferences with advanced filtering and search.

Dispute Resolution Oversight: Centralized view of all customer disputes and their resolution status with escalation paths and communication logs.

VIP Customer Management: Special handling and tracking for high-value customers with dedicated support channels and preferential treatment options.

Feedback & Review Monitoring: Aggregate and analyze all customer feedback and reviews with sentiment analysis and trend identification.

3.1.3 Financial Control

Revenue Management:

Commission Configuration: Commission rate configuration per role, tier, and even per service type with historical tracking of changes.

Payment Gateway Management: Centralized management of payment gateway configurations (API keys, webhooks) with failover settings for high availability.

Tax Configuration: Dynamic GST and other local tax settings based on operational cities/states with automatic updates for regulatory changes.

Financial Reconciliation: Automated reconciliation tools between bank statements, payment gateway reports, and internal transaction logs, with exception handling for discrepancies.

Payout Management: Automated payout scheduling (e.g., weekly, bi-weekly) and processing for partners and vendors with approval workflows for large payouts.

Financial Analytics:

Revenue Forecasting: Advanced revenue forecasting and profit margin analysis with predictive models based on historical data and current pipeline.

Cost Optimization: Insights into cost optimization areas and real-time cash flow management with detailed trend analysis.

Investment Analysis: ROI calculations for marketing campaigns, new features, and regional expansions.

Financial Health Metrics: Comprehensive financial health indicators with benchmarking against industry standards.

3.1.4 System Configuration

Platform Settings:

Global Configuration: Global configuration management (platform name, version, maintenance mode scheduling) with full version control for settings changes.

Feature Flags: Dynamic feature flags and toggles for enabling/disabling specific functionalities for different user groups or regions, with A/B testing capabilities.

Regional Settings: Regional settings customization (currency, date format, local regulations, localized content) with geo-based detection for user onboarding.

Integration Management: Centralized management of API keys and configurations for all third-party services with status monitoring and health checks.

API Management: API rate limiting and security settings with usage analytics and alerts for suspicious activity.

Security Management:

Authentication Policies: Configurable multi-factor authentication (MFA) enforcement policies with role-based requirements and backup methods (e.g., recovery codes).

Password Policies: Configurable password policies (complexity requirements, expiry intervals) with real-time strength indicators during setup.

Session Management: Secure JWT-based session management controls (configurable timeouts, concurrent session limits) with active session monitoring and forced logout capabilities.

Audit Logs: Comprehensive audit log management for all user actions and system changes with search, filtering, and export capabilities for forensic analysis.

Data Encryption: Centralized data encryption settings for sensitive data at rest (database, file storage) and in transit (TLS/SSL for APIs) with key management.

3.1.5 Compliance & Legal

Regulatory Compliance:

Tax Compliance: Automated GST and other local tax compliance tools with calculation validation and automated reporting.

Legal Documents: Version-controlled legal document management (platform-level agreements, terms of service, privacy policy) with digital signing capabilities.

Privacy Management: Privacy policy configuration and user consent management (e.g., cookie consent) with full audit trails.

Data Protection: Adherence to Indian data protection laws and global standards like GDPR, with automated data subject request (DSR) workflows (e.g., data export, deletion).

Audit & Reporting:

Audit Trail: Comprehensive audit trail logging for all system activities and user actions with detailed forensic capabilities and anomaly detection.

Compliance Reports: Automated generation of reports required for regulatory filings and internal audits with scheduling and distribution options.

3.1.6 CRM System Management (NEW)

CRM Configuration & Integration:

CRM Platform Management: Centralized control over the integrated CRM systems (LeadPro CRM, Perfex CRM). Includes configuration settings, user management within the CRM context, and integration parameters (API keys, webhooks).

Voice CRM Administration: Specific management tools for Perfex CRM with LeadPilot AI module, covering voice automation settings, call routing rules, IVR configuration, and AI model training parameters.

Integration Dashboard: Real-time monitoring of all CRM integrations, including API health checks, data synchronization status, and error logs for immediate issue resolution.

CRM Analytics: Comprehensive analytics on CRM performance, lead conversion rates, call metrics (volume, duration, outcomes), and team productivity within the CRM context.

Automation Rules: Configuration of automated lead routing rules, trigger-based follow-up sequences, and escalation rules directly impacting CRM workflows.

3.2 ADMIN/OPERATIONS DASHBOARD (ENHANCED)
3.2.1 Lead Management Engine (ENHANCED)

Lead Acquisition:

Multi-channel Capture: Integrates lead capture from various sources (website forms, mobile app, direct partner referrals, builder integrations, social media campaigns, dedicated phone lines) with automated source tracking.

Intelligent Lead Scoring: Automated and manual lead scoring based on factors like budget, property type, specific requirements, urgency, and engagement history, enhanced by AI/machine learning to predict conversion potential and identify high-value leads.

Lead Qualification: Structured lead qualification workflow with definable stages (e.g., Raw, Contacted, Qualified, Disqualified) and automated actions (e.g., send follow-up email, assign task).

Lead Enrichment: Automatic data enrichment from external sources (e.g., public property records, demographic data) to provide a more complete lead profile with data validation.

Lead Segregation/Distribution Engine (CRM-like):

Algorithm-based Matching: Automated matching of leads to designers/PMs based on location (city-wise assignment, pulling active cities from DB), expertise (style, project type), availability, performance history, and lead priority. Machine learning optimization continuously improves match accuracy.

Manual Override: Admins can manually adjust lead assignments with justification logging, allowing for nuanced decision-making.

Load Balancing: Ensures fair and efficient distribution of leads among available designers/PMs with performance weighting (e.g., assign more to higher-performing designers).

Priority Handling: Prioritize high-value or urgent leads with special routing rules and immediate notifications.

Assignment History: Comprehensive tracking of lead assignment history and individual designer/PM performance per lead with detailed analytics.

CRM Functionality (LeadPro CRM Integration): Full CRM capabilities integrated with LeadPro CRM for comprehensive lead management. This includes managing lead status, adding detailed notes, scheduling follow-ups (calls, meetings, emails) with activity logging, and managing a unified lead pipeline.

Voice Call Management (Perfex CRM with LeadPilot AI Integration): Seamless bi-directional API integration with Perfex CRM + LeadPilot AI for automated voice calls, intelligent call routing, and AI-powered lead engagement.

Automated Call Logging: All calls made via the integrated system are automatically logged in the CRM with recording, duration, transcripts, and sentiment analysis.

AI-Powered Call Assistant: LeadPilot AI provides automated follow-up calls, appointment scheduling, and lead qualification, reducing manual effort.

Call Analytics: Comprehensive call analytics including call volume, conversion rates, call duration, and agent performance.

VoIP Integration: Integrated VoIP system for click-to-call functionality directly within the CRM interface.

Call Recording & Compliance: Automatic call recording with compliance features and quality assurance checks.

Lead Nurturing: Automated lead nurturing workflows with customizable email sequences, automated task assignments for follow-up, and engagement tracking (e.g., email opens, link clicks).

3.2.2 Project Oversight

Project Monitoring:

Real-time Status Tracking: Aggregate view of all projects with real-time progress updates, current phase, and overall status with drill-down capabilities to individual project dashboards.

Risk Identification: Automated alerts for project delays, budget overruns, and quality issues with integrated risk scoring based on project health indicators.

Performance Benchmarking: Compare individual project performance against predefined KPIs and industry benchmarks with variance analysis.

Customer Satisfaction: Real-time tracking of customer feedback and ratings across projects with sentiment analysis to proactively identify dissatisfied customers.

Resource Utilization: High-level overview of resource allocation across projects with optimization recommendations and capacity planning insights.

City-wise Segregation: Robust filtering and viewing of projects by city (e.g., Mumbai, Bangalore, Hyderabad), allowing regional operations managers to focus on their domain and analyze local performance.

Quality Assurance:

Quality Score Tracking: Comprehensive quality score tracking per project and per phase with trend analysis and historical data.

Inspection Management: Overview of scheduled and completed inspections with calendar view and automated reminders.

Defect Tracking: Centralized defect resolution tracking with assignable corrective action workflows and root cause analysis tools.

Performance Monitoring: Detailed vendor and designer performance monitoring for quality with customizable scorecards and comparative analytics.

3.2.3 Communication Hub

Internal Communication:

Team Messaging: Dedicated team messaging platform with channels for different departments/projects, direct messages, and secure file sharing with search capabilities and message archiving.

Announcements: System-wide and targeted announcements to specific roles or regions with read receipts and acknowledgment tracking.

Escalation Management: Configurable escalation management with automated routing rules and SLA tracking for critical issues.

Knowledge Base: Internal repository for FAQs, best practices, training materials, and operational guidelines with version control and search.

3.3 PROJECT MANAGER DASHBOARD (ENHANCED)
3.3.1 Project Execution

Timeline Management (GanttChart.js):

Interactive Gantt Charts: Dynamic, interactive Gantt charts for detailed project timelines, showing tasks, durations, and dependencies with drag-and-drop editing for quick adjustments.

Critical Path Analysis: Automated identification of the critical path to highlight key tasks whose delays will impact overall project completion, with visual alerts.

Progress Updates: Automated progress updates based on task completion (e.g., linking task status to overall project progress) with real-time synchronization.

Conflict Detection: Automated conflict detection for resource scheduling and task dependencies with resolution suggestions.

Milestone Tracking: Integrated milestone tracking with dependency management and automated notifications to relevant stakeholders.

Budget Control (BudgetTracking.js):

Real-time Tracking: Real-time budget vs. actual spending tracking for each project and its phases with detailed variance analysis.

Cost Prediction: Predictive models for cost overrun identification and alerts with mitigation recommendations based on current spending patterns.

PO Integration: Direct integration with Purchase Order (PO) management for automated expense logging and reconciliation against budget.

Payment Tracking: Tracking of vendor payments initiated by procurement with approval workflows for PM-level authorizations.

Change Order Management: Formal management of change orders and budget revisions with approval processes involving customers and finance.

3.3.2 Resource Coordination

Team Management (ResourceManagement.js):

Resource Allocation: Detailed resource allocation and scheduling for on-site teams (electricians, carpenters, civil teams) with a visual calendar view showing availability.

Skill-based Assignment: Intelligent, skill-based assignment to match tasks with qualified personnel, with competency tracking for each team member.

Availability Management: Real-time tracking of team availability and workload, with automated alerts for over-utilization or under-utilization.

Conflict Resolution: Tools to identify and resolve resource conflicts with optimization algorithms for re-assignment.

Performance Tracking: Team performance tracking with productivity metrics (e.g., task completion rate per team) and individual utilization rates.

Material Management (Procurement Logistics ProcurementLogistics.js):

Material Requirements: Real-time monitoring of material requirements based on designer's BOQ with automated checks against procurement inventory.

Vendor Coordination: Direct communication channels and coordination tools with the Procurement Team and direct suppliers for material orders.

Delivery Tracking: Real-time tracking of material delivery status from warehouse/vendor to site with GPS integration (if available from logistics partners).

Quality Inspection: Direct logging of quality inspection results for received materials at the site with defect tracking and reporting.

3.3.3 Quality Control

Quality Assurance (QualityControl.js):

Digital Checklists: Customizable digital inspection checklists and workflows for various project phases (e.g., civil work, electrical, plumbing, finishing, painting) accessible via mobile devices.

Photo Documentation: Mandatory photo/video documentation requirements for specific inspection points, with geotagging and timestamping to ensure authenticity.

Defect Management: Centralized defect tracking and resolution workflows with assignable tasks, severity levels, and SLA tracking for corrective actions.

Quality Scoring: Automated quality score calculation for each project phase based on checklist completion and defect resolution, with benchmarking.

Certification Management: Digital management of quality certifications for materials or workmanship with digital signatures and expiry tracking.

3.3.4 Client Communication Management (CRM Integration)

Access CRM Communication History: Direct access to the complete communication history for clients from integrated CRM systems (calls, emails, SMS).

Click-to-Call: Use integrated VoIP system to initiate calls to clients directly from the dashboard, leveraging CRM call logging capabilities.

Automated Call Logging: All calls automatically logged in CRM with recording, transcription, and sentiment analysis (via LeadPilot AI).

Follow-up Automation: Set up automated follow-up sequences and appointment reminders using CRM workflow automation.

Communication Analytics: Review communication analytics including response times, call outcomes, and client satisfaction metrics.

Document Integration: Access and share project documents directly through the CRM interface.

3.4 INTERIOR DESIGNER DASHBOARD (ENHANCED)
3.4.1 Business Management

Lead Marketplace (LeadMarketplace.js):

Advanced Filtering: Advanced lead filtering and search capabilities (location, budget, style preference, property type, lead source) with saved search criteria and automated new lead alerts.

Lead Credit Management: Transparent display of credit balance and explicit credit cost for each lead, with real-time transaction history for credit usage.

Lead Workflow: Intuitive lead acceptance/rejection workflow with clear deadlines and automated notifications.

Conversion Tracking: Visual lead conversion tracking funnel with stage analysis (e.g., accepted, contacted, proposed, converted, lost) and success rates.

Performance Analytics: Detailed performance analytics on lead conversion rates, acquired project value, and ROI calculation per lead source.

AI-Powered Lead Qualification: Leads displayed with AI-powered qualification scores and recommendations (from LeadPilot AI).

Automated Follow-up: Use LeadPilot AI to initiate automated follow-up calls and sequences for accepted leads.

Call Analytics: Review call analytics and sentiment analysis for each lead interaction through CRM integration.

Personalized Engagement: Access comprehensive lead profiles with communication history and preferences from LeadPro CRM.

Digital Wallet (DigitalWallet.js):

Credit Management: Seamless flow for purchasing credits (e.g., via Razorpay integration) to acquire leads, with multiple payment options (cards, UPI, net banking).

Earnings Tracking & Withdrawal: Real-time tracking of milestone payments received (automatically credited upon PM approval). Direct bank transfer withdrawal requests with clear processing status and estimated transfer times.

Financial Reporting: Comprehensive transaction history and financial reporting (earnings, expenses, taxes) with export capabilities (CSV, PDF).

Tax Management: Automated tax deduction calculation and documentation (e.g., TDS certificates for earnings) with compliance reporting features.

Financial Planning: Basic financial planning tools (e.g., estimated monthly income based on pipeline, tracking outstanding payments) with simple forecasting models.

3.4.2 Design Tools

BOQ Generator (BOQGenerator.js):

Material Integration: Deep, real-time integration with the Material Catalog for up-to-date pricing, availability, and detailed product specifications, with automated alerts for price changes.

Cost Calculation: Automated calculation of project cost based on materials, design fees, labor estimates, contingency, and dynamically applied markups/discounts.

Margin Optimization: Tools to adjust pricing and margins for profitability, with "what-if" analysis to see impact on total cost and earnings.

Template Library: Access to a library of pre-defined, customizable design templates (e.g., for 2BHK living rooms, modular kitchens) for rapid BOQ generation, saving time and ensuring consistency.

Proposal Generation: Generate professional, branded, client-facing proposals directly from the BOQ, including visual breakdowns, terms and conditions, and customizable branding options.

Design Studio (DesignStudio.js):

Design Management: Centralized tools for uploading, organizing, and presenting 2D/3D design files (CAD, SketchUp, Renderings, Mood Boards) with version control and revision history.

Material Visualization: Integrated material visualization tool to apply and preview materials within designs (basic rendering/texture mapping). Future: AR/VR integration for immersive client experience.

Client Collaboration: Real-time commenting tools on designs, integrated version comparison, and real-time feedback loops with notification triggers.

Design Library: Personal design library management to organize and reuse design elements, mood boards, furniture models, and past project assets with tagging and search.

3.4.3 Client Management

Project Tracking (DesignerProjects.js):

Project Overview: Dedicated hub for all assigned projects, providing a snapshot of progress, budget utilization, key milestones, and next steps with intuitive status indicators.

Communication Hub: Integrated messaging with clients, allowing sharing of design revisions, project updates, and collecting feedback. Includes search capabilities for past conversations, and a unified view of CRM-logged communications.

Design Approval Workflow: A structured, multi-stage process for clients to review, comment on, and formally approve designs directly within the portal, with version comparison tools.

Progress Reporting: Automated progress reporting to clients (e.g., weekly summaries) with customizable content and frequency.

Feedback System: Integrated system for collecting feedback and monitoring client satisfaction throughout the project lifecycle with sentiment analysis tools to flag potential issues.

3.5 CUSTOMER PORTAL (ENHANCED)
3.5.1 Project Monitoring

Progress Dashboard (CustomerProjectOverview.js, CustomerProgressTracking.js):

Visual Progress Tracking: Intuitive progress bars, overall project percentage, and visual timelines showing completed, in-progress, and upcoming phases with interactive elements for detailed views.

Milestone Tracking: Clear display of completed and pending milestones, with associated dates, payment statuses, and dependency visualization to understand project flow.

Activity Feed: A dynamic list of upcoming activities and key events for the project with calendar integration and reminders.

Media Gallery: Real-time photo and video uploads from the site, categorized by phase (e.g., Civil Work, Finishing), providing visual transparency. Includes filtering, search, and commenting capabilities on media.

Progress Analytics: Simple progress analytics with comparison to planned timelines and (anonymized) industry benchmarks.

Financial Management (CustomerFinancials.js):

Payment Schedule: Clear, milestone-based payment schedule with due dates, amounts, and payment status (Paid, Pending, Overdue), with an integrated calendar view.

Invoice Management: Automated generation and easy access to all project invoices for download (PDF format) with search and filtering capabilities.

Secure Payment Processing: Seamless integration with leading payment gateways (e.g., Razorpay) for secure online transactions with multiple payment options (credit/debit cards, UPI, net banking).

Refund Management: Transparent initiation and tracking of refund requests with clear approval workflows and status updates.

Tax Documentation: Direct access to all relevant tax documentation (e.g., GST details on invoices, TDS certificates if applicable) for compliance.

3.5.2 Communication & Collaboration

Communication Hub (CustomerCommunication.js):

Multi-channel Communication: Offers unified communication options including direct, secure real-time messaging (chat), integrated video consultation scheduling, and click-to-call functionality via VoIP integration.

Complete History Tracking: All communications (calls, emails, SMS, in-app messages) are synchronized and displayed in a unified timeline via CRM integration.

File Sharing: Secure ability to share documents and reference images (e.g., inspirational photos) with the project team with version control.

Automated Responses & Updates: Receive automated responses and updates through CRM workflow automation (e.g., payment reminders, progress updates).

Appointment Scheduling: Schedule consultations and meetings using integrated calendar and CRM.

Feedback System: Integrated feedback and approval system (tied to CustomerDesigns.js) allowing direct comments on designs and other project aspects, with automated notifications for team responses.

Dispute Resolution: Clear access to a formal dispute resolution channel with transparent escalation paths and tracking.

3.5.3 Document Management

Digital Vault (CustomerDocuments.js):

Centralized Access: Centralized, secure access to all project-related documents, organized by category (e.g., Contracts, Designs, BOQ, Technical, Warranty, Certificates, Invoices, Reports).

Contract Management: Includes all signed agreements and contracts (e.g., scope of work, service agreements) with version tracking.

Design Files: Comprehensive access to all design files, 2D blueprints, and 3D renders with preview capabilities and download options.

Material Specifications: Detailed material specifications and product sheets for all chosen materials, with links back to the Material Catalog for reference.

Warranty Management: Digital warranty documentation for all installed materials and services, including expiration tracking and automated reminders.

Completion Documents: Access to project completion certificates and handover documents with digital signatures.

Advanced Features: Version control for all documents with comparison capabilities and granular access control (e.g., read-only for certain documents).

3.6 VENDOR PORTAL (ENHANCED)
3.6.1 Inventory Management

Real-time Stock Tracking (src/components/vendor/VendorInventory.js - NEW):

Automated Updates: Tools for vendors to efficiently update their product stock levels in real-time, including batch operations for multiple products.

Stock Alerts: Configurable low-stock and out-of-stock alerts (via in-app, email, SMS) with suggestions for reordering or restocking based on predictive analytics of demand.

Multi-location Tracking: Ability to track inventory across different vendor warehouses or storage locations, with tools for managing inter-location transfers.

Batch & Expiry Tracking: For time-sensitive materials (ee.g., paints, adhesives), track specific batches and their expiry dates with automated notifications.

Inventory Valuation: Real-time inventory valuation reporting using multiple calculation methods (e.g., FIFO, LIFO, Weighted Average).

Catalog Management (src/components/vendor/VendorProductCatalog.js - NEW):

Product Management: Intuitive interface for adding new product listings with detailed specifications, rich descriptions, and multiple high-resolution images. Supports bulk upload of products via CSV.

Pricing Management: Flexible pricing management, including tiered pricing, volume-based discounts, and special promotional capabilities.

Categorization: Tools for categorizing products and applying relevant filters, with support for hierarchical category structures.

SEO Optimization: Basic SEO optimization tools for improving product visibility within Gharinto's internal search and external search engines, with analytics tracking.

3.6.2 Order Management

Order Processing (src/components/vendor/VendorOrderManagement.js - NEW):

PO Management: Centralized dashboard to receive and view all Purchase Orders (POs) issued by Gharinto, with filtering and search capabilities.

Status Tracking: Ability to update order status (e.g., "Received," "Processing," "Ready for Pickup," "Shipped," "Delivered") with automated notifications to relevant Gharinto teams and PMs.

Shipping Coordination: Tools to input shipping details, tracking numbers (with carrier integration), and confirmed delivery dates.

Delivery Confirmation: Workflows for proof of delivery (e.g., signature capture, photo upload) upon successful delivery.

Returns Management: Streamlined process for managing returns and exchanges with approval workflows and tracking.

Order Communication (CRM Integration): All order-related communication managed through the integrated CRM system, including automated notifications for updates, delivery schedules, and payment confirmations.

Financial Management (src/components/vendor/VendorFinancials.js - NEW):

Payment Tracking: Real-time view of payment statuses for fulfilled POs, linked to specific POs, with reconciliation tools.

Invoice Generation: Generate and manage invoices for fulfilled orders with customizable templates and automated submission to Gharinto's finance.

Settlement Processing: Track financial settlements and payout schedules from Gharinto, with historical data and detailed breakdown.

Tax Documentation: Access to all relevant tax documentation (e.g., TDS certificates, GST reports) for their sales through Gharinto.

Financial Reporting: Comprehensive financial reporting on sales, revenue, and historical payments with export capabilities (CSV, PDF).

3.7 EMPLOYEE PORTAL (ENHANCED)

Employee-Specific Dashboards:

Role-based Views: Depending on the granular role assigned by the Super Admin (e.g., "Lead Qualifier," "Payment Processor," "Site Inspector"), an employee logs into a customized dashboard with only their permitted sections visible and accessible.

Customized Interface: The interface is dynamically customized based on the employee's role and permissions, with personalization options for dashboard layouts.

Task-focused Design: The design is optimized for specific employee tasks and workflows, potentially incorporating workflow automation and guided processes, including CRM-driven tasks.

Task-Specific Modules:

Module Access: Employees would have access only to specific modules and data relevant to their assigned tasks (e.g., a "Lead Qualifier" would have a restricted view of Lead Management, focusing only on qualification fields and lead status updates, with integrated CRM tools for follow-up and call management).

Workflow Automation: Automated workflows for common employee tasks (e.g., assigning follow-ups, generating standard reports) with integrated approval processes.

Task Management: Personal task assignment and tracking within their modules, with deadline management and performance metrics.

Reporting:

Role-specific Reports: Access to specific reports and analytics dashboards relevant to their job function, with scheduling and distribution options.

Data Visualization: Customized data visualization based on employee role and data access, with drill-down capabilities within their authorized scope.

Export Capabilities: Ability to export reports in multiple formats (CSV, PDF) relevant to their role.

ðŸ”§ TECHNICAL ARCHITECTURE (ENHANCED)

The Gharinto platform is built on a modern, scalable, and secure technology stack designed for high performance and extensibility.

4.1 Technology Stack (Enhanced)
Layer	Technology	Rationale
Frontend	React.js (v19+), TypeScript, Tailwind CSS, Chart.js, Font Awesome, CRACO	React provides a component-based architecture for interactive UIs. TypeScript ensures type safety. Tailwind CSS for a utility-first approach to highly customizable and responsive styling, adhering to the pale green, black, and green theme (client reference). Chart.js for data visualization. Font Awesome for a rich icon set. CRACO for flexible Create React App configurations.
State Management	Redux Toolkit, React Query	Redux Toolkit for predictable and scalable client-side state management, with built-in dev tools for debugging. React Query for efficient server state management, enabling caching, background re-fetching, and optimistic UI updates, significantly improving perceived performance and reducing complex data fetching logic.
UI Components	Material-UI, Ant Design, Custom Component Library	Leveraging battle-tested UI component libraries like Material-UI or Ant Design for rapid development of consistent and accessible UI elements. A Custom Component Library will be developed for brand-specific elements and complex interactive components that are unique to Gharinto's design system.
Mobile	React Native	Enables efficient cross-platform (iOS/Android) mobile application development from a single codebase, accelerating time-to-market for customer and designer portals, ensuring a consistent experience across web and mobile.
Backend	Node.js (Express/NestJS)	Excellent choice for building scalable, real-time, and event-driven APIs due to its non-blocking I/O model. A microservices architecture is strongly recommended for long-term scalability, independent deployment of services (e.g., User Service, Project Service, Financial Service, Inventory Service), and improved fault isolation.
Database	PostgreSQL (Primary) + MongoDB (Secondary for flexible data)	PostgreSQL serves as the primary relational database for structured data (users, roles, permissions, projects, financial transactions, static material attributes), ensuring strong data integrity, complex querying capabilities, and ACID compliance. MongoDB (or similar NoSQL like Couchbase) is used as a secondary database for flexible, document-based data (e.g., dynamic BOQ details, complex design file metadata, communication logs, user preferences, activity feeds), allowing rapid iteration and schema evolution.
Cache	Redis	High-performance in-memory data store used for caching frequently accessed data (e.g., dashboard metrics, material catalog lookups, session management, dynamically loaded user permissions/menus), significantly improving API response times and reducing database load. Also used for real-time messaging queues and rate limiting.
Real-time	Socket.io	Enables bi-directional, low-latency communication between clients and server, crucial for live project progress updates, real-time chat, instant notifications, and dynamic inventory synchronization. Supports various transport mechanisms (WebSockets, long polling) for broad compatibility.
File Storage	AWS S3 / Google Cloud Storage	Highly scalable, durable, and cost-effective object storage for all static assets, user-uploaded content (design files, high-resolution project photos, project documents, warranty certificates), and automated backups. Integrated with a Content Delivery Network (CDN) for fast content delivery globally.
Search	Elasticsearch / Algolia	Powerful search engine for advanced full-text search and faceted search capabilities across projects, materials, leads, and users, providing fast and highly relevant search results (e.g., in Material Catalog, Lead Marketplace, Admin User Search, Document Vault).
Analytics	Google Analytics + PostHog + Custom BI Tool	Google Analytics for high-level website traffic and basic user behavior. PostHog for granular product analytics, feature usage tracking, and A/B testing capabilities. Integration with a Custom Business Intelligence (BI) Tool (e.g., Metabase, Power BI, or Tableau) for complex data analysis, custom dashboards for Super Admin, and detailed operational reporting.
DevOps	AWS/GCP/Azure (Containerization with Docker/Kubernetes)	Utilizes a robust cloud infrastructure (AWS EC2, ECS/EKS; GCP Compute Engine, GKE; Azure VMs, AKS) for scalable hosting. Implements comprehensive CI/CD pipelines (e.g., GitHub Actions, GitLab CI) for automated testing and deployments. Monitoring (Prometheus, Grafana) and centralized logging (ELK stack) are essential for operational visibility. Docker for consistent environments and Kubernetes for orchestration of microservices.
CRM System	LeadPro CRM + Perfex CRM with LeadPilot AI	LeadPro CRM will serve as the primary comprehensive lead management and call center platform. Perfex CRM with LeadPilot AI module will provide advanced voice automation, intelligent call routing, and AI-powered lead engagement, integrated for seamless data flow.
VoIP System	Twilio / Plivo	Twilio or Plivo will be integrated as the core VoIP system for all click-to-call functionality, automated dialing, call recording, and transcription services directly within the CRM and Gharinto dashboards.
API Integration	Zapier / Make (Integromat)	For robust and scalable integration between multiple CRM systems, external voice platforms, and other third-party applications, providing workflow automation capabilities.
4.2 Real-time Features (End-to-End Tools) (ENHANCED)
4.2.1 Live Project & Communication Updates

Project Progress Updates (Customer Portal, PM Dashboard): Real-time status changes for tasks and milestones (e.g., task marked 'completed', milestone achieved) pushed instantly to relevant dashboards. Includes instant notifications for critical events (e.g., "Design Approved," "Material Delivered") with customizable alert types (in-app, email, SMS).

Live Chat Integration (Customer, Designer, PM, Admin portals): A full-featured chat system supporting real-time messaging between all relevant stakeholders. Includes read receipts, typing indicators, secure file sharing, searchable message history, and organized conversations (e.g., by project, by user).

Photo/Video Upload Notifications (Customer Portal): Instant alerts to customers when new site photos or progress videos are uploaded by the PM or site team, with inline preview capabilities in the notification.

Budget Update Alerts (PM Dashboard, Admin Financials): Real-time notifications for significant budget changes, nearing budget limits, or potential cost overruns, with configurable thresholds and drill-down to affected line items.

4.2.2 Real-time Inventory & Order Synchronization

Real-time Stock Updates (Vendor Portal, Procurement Portal, Material Catalog): Automated inventory level updates whenever a product is sold, ordered, or received. Ensures accurate stock information across all platforms. Includes automated conflict resolution for simultaneous updates with version control logging.

Cross-platform Synchronization: Inventory data is synchronized seamlessly and instantly between the Vendor Portal (vendor-specific stock), Gharinto's central Material Catalog (aggregated stock for designers), and Procurement systems (for planning and ordering).

Automated Low-stock/Out-of-stock Alerts: Instant notifications to vendors and the Gharinto procurement team when stock levels fall below predefined thresholds, with escalation rules to trigger automated reorder suggestions.

Order Processing Updates (Vendor Portal, Procurement Portal): Real-time status changes for Purchase Orders (e.g., from "New" to "Processing" to "Shipped" to "Delivered") are reflected instantly across all relevant dashboards. Includes audit trails for all status changes.

Delivery Status Tracking (Procurement Portal, Customer Portal): Live tracking of material shipments and estimated delivery times, integrating with logistics partners' APIs for real-time GPS tracking (where available).

4.2.3 Real-time Financial Tracking

Live Transaction Monitoring (Admin, Designer, Vendor Financials): Real-time processing and visibility of all payment transactions (milestone payments from customers, vendor payouts by Gharinto, designer lead credit purchases/earnings withdrawals). Includes automated reconciliation tools.

Instant Wallet Updates (Designer Digital Wallet): Real-time reflection of credit purchases, earnings, and withdrawals in the designer's digital wallet, with an immediately updated transaction history.

Automated Commission Calculations: Commissions (for designers and PMs) are calculated and updated instantly upon milestone completion or successful lead conversion, including real-time application of tax calculations (e.g., TDS).

Live Financial Dashboards: Real-time revenue, expense, and profit margin updates on Admin and Super Admin dashboards, with drill-down capabilities to individual transactions or projects.

4.3 Security Architecture (Enhanced)
4.3.1 Authentication & Authorization

Multi-factor Authentication (MFA): Configurable MFA policies enforced for Admin, Super Admin, PM, and Designer roles (email/SMS OTP verification) with backup methods (e.g., recovery codes).

Biometric Authentication: Support for biometric authentication on mobile apps (fingerprint, face recognition) for seamless and secure login, with secure fallback options for enhanced convenience and security.

Single Sign-On (SSO): Integration with standard SSO providers (e.g., Google Workspace, Microsoft Azure AD) for internal employees, with directory synchronization for streamlined user management.

Social Login Integration: For customer convenience (e.g., Google, Facebook login) with secure profile data import and linking.

Device Recognition & Session Management: Advanced device fingerprinting to recognize trusted devices, secure JWT-based session token management, configurable session timeouts, and detection/management of concurrent sessions with suspicious activity alerts.

Dynamic RBAC (Role-Based Access Control): All access to features, data, and menu items is controlled by dynamically configurable roles and granular permissions stored securely in the database. Supports permission inheritance for hierarchical roles.

Attribute-Based Access Control (ABAC): Extends RBAC by restricting access based on user attributes (e.g., a PM only sees projects in their assigned city, an employee only sees data for their department) or resource attributes (e.g., only designers involved in a project can access its design files). Policies are dynamically evaluated.

Temporary Access Grants: Super Admin can grant temporary, time-bound access to specific modules or data for auditing or specific tasks, with automated revocation and audit logging.

Just-in-Time Access: For highly sensitive operations (e.g., Super Admin financial payouts, critical system configurations), require re-authentication or explicit secondary approval (e.g., from another authorized admin).

4.3.2 Data Protection

Encryption Strategy:

End-to-End Encryption (E2EE): For sensitive client-designer communication (chat messages) and certain document transfers, ensuring data remains encrypted from sender to receiver. Key management protocols are secure.

Encryption at Rest: All data stored in databases (PostgreSQL, MongoDB), caches (Redis), and file storage (AWS S3) is encrypted using industry-standard algorithms (e.g., AES-256).

Encryption in Transit: All API communications (frontend-backend, backend-integrations, mobile app) use strong TLS/SSL protocols with robust certificate management.

Data Privacy: Strict adherence to Indian data protection laws and global standards like GDPR. Implementation of data minimization principles, robust anonymization techniques for analytical data, and clear data retention policies with automated enforcement.

Privacy by Design: Integrate privacy considerations into every stage of software development, ensuring privacy is a default setting and a core architectural principle.

4.3.3 Threat Detection & Prevention

Security Monitoring: Continuous, real-time monitoring for suspicious activities, unauthorized login attempts, and data anomalies through integrated SIEM (Security Information and Event Management) systems.

Intrusion Detection/Prevention Systems (IDS/IPS): Network and host-based systems to detect and actively prevent unauthorized access attempts and malicious network traffic with automated response mechanisms.

Fraud Prevention: Advanced machine learning models to detect fraudulent financial transactions (e.g., unusual payout requests, suspicious payment patterns) and other unusual user behavior.

Automated Blocking: Automatic blocking of suspicious IP addresses or accounts upon detecting malicious activity, with whitelisting capabilities for legitimate access.

Continuous Security Assessment: Regular vulnerability scanning, dynamic application security testing (DAST), penetration testing (by third parties), and ongoing security audits with detailed remediation tracking.

4.3.4 CRM Security (NEW)

CRM Data Protection:

Encryption: End-to-end encryption for all CRM data and communications where applicable, ensuring sensitive lead and client information is protected.

Access Control: Granular access control for CRM data and features, integrated with Gharinto's dynamic RBAC system, to ensure only authorized personnel can view or modify CRM entries.

Audit Trails: Comprehensive audit trails for all CRM activities (e.g., lead status changes, call logs, note additions) to maintain accountability and traceability.

Data Retention: Configurable data retention policies for CRM data, ensuring compliance with privacy regulations.

Backup & Recovery: Automated backup and disaster recovery mechanisms for CRM systems to prevent data loss.

Compliance Management:

GDPR Compliance: GDPR-compliant data handling and privacy features for customer data within the CRM, where applicable.

Call Recording Compliance: Compliance-focused call recording features, including explicit consent management and secure storage of recordings.

Data Subject Rights: Tools for managing data subject requests (e.g., data access, deletion) within the CRM context.

Privacy Policies: Automated privacy policy management and updates, ensuring CRM operations align with platform policies.

Regulatory Reporting: Automated compliance reporting and documentation for CRM-related activities.

Integration Security:

API Security: Secure API authentication with OAuth 2.0 and API keys for CRM integrations. Granular authorization controls for API access to limit data exposure.

Webhook Security: Cryptographically signed webhook notifications for real-time data synchronization. IP Whitelisting and payload validation to ensure secure and legitimate data transfers.

7.2 Compliance & Governance
7.2.1 Regulatory Compliance

Tax Compliance: Automated GST calculation, multi-state tax adherence, and automated tax reporting to simplify compliance. Integration with tax APIs for real-time validation.

Legal Compliance: Automated management of Terms of Service, Privacy Policy, and user consent forms. Tools for managing data subject requests (DSR) workflows (e.g., data export, deletion) in compliance with privacy regulations.

7.2.2 Audit & Reporting

Comprehensive Audit Trail: Detailed logging of all user actions (who, what, when, where), system changes, and data access. Crucial for accountability, forensic analysis, and incident response.

Compliance Reporting: Automated generation of reports required for regulatory filings and internal audits, with scheduling and secure distribution options.

ðŸ”— INTEGRATION REQUIREMENTS (ENHANCED)
8.1 CRM Integration Requirements (NEW)
8.1.1 LeadPro CRM Integration

Integration Points:

Lead Synchronization: Real-time, bi-directional synchronization of lead data between Gharinto (Lead Management Engine) and LeadPro CRM. Includes new lead creation, status updates, and profile enrichments.

Communication Sync: Synchronization of all communication history (calls, emails, SMS) related to leads and customers, ensuring a unified view across both platforms.

Status Updates: Real-time status updates and notifications for lead activities (e.g., qualification changes, assignment) pushed between systems.

User Management: Synchronization of user accounts and permissions, ensuring sales/operations teams in LeadPro have correct access based on Gharinto roles.

Analytics Integration: Integration of LeadPro CRM analytics data with Gharinto's Super Admin and Admin dashboards for comprehensive reporting.

Technical Requirements:

API Connectivity: RESTful API integration with comprehensive endpoint coverage for all necessary CRM operations.

Webhook Support: Bidirectional webhook support for real-time, event-driven updates to minimize polling and ensure data freshness.

Data Mapping: Robust, automated data mapping and transformation rules between Gharinto's lead structure and LeadPro CRM schema, with configurable options.

Error Handling: Comprehensive error handling and recovery mechanisms for integration failures, with automated alerts.

Performance: High-performance integration with sub-second response times for critical data synchronization.

8.1.2 Perfex CRM with LeadPilot AI Integration

Integration Points:

Voice Call Integration: Primary integration for all voice calling capabilities (click-to-call, automated calls) from Gharinto's Lead Management, seamlessly logging into Perfex CRM.

AI Automation: Integration of AI-powered automation and workflows from LeadPilot AI (e.g., automated lead follow-up sequences, intelligent call routing based on AI analysis) directly into Gharinto workflows.

Communication History: Synchronization of call logs, AI transcripts, and sentiment analysis results from LeadPilot AI into Gharinto's unified communication history.

Appointment Management: Integration of calendar and appointment scheduling features, allowing appointments booked via LeadPilot AI to sync with Gharinto calendars.

Analytics Integration: Integration of AI analytics and call performance metrics from LeadPilot AI with Gharinto's business intelligence dashboards.

Technical Requirements:

Module Integration: Direct integration with LeadPilot AI module and relevant Perfex CRM modules.

Real-time Processing: Real-time processing of voice calls and AI analysis to provide immediate insights and actions.

Data Storage: Efficient storage and retrieval of call recordings and transcripts within the Perfex environment, accessible via API.

Scalability: Scalable architecture to handle high call volumes and concurrent AI processing.

Reliability: High-availability integration with failover capabilities to ensure uninterrupted voice services.

8.1.3 Unified CRM Dashboard

Centralized Management:

Unified Lead View: A single dashboard within Gharinto (Admin/Operations) showing all leads across both CRM systems (LeadPro CRM, Perfex CRM) with unified status tracking and deduplication.

Communication History: Complete communication history for each lead/customer, including calls (with recordings/transcripts), emails, SMS, and in-app messages, presented in a unified timeline.

Performance Metrics: Consolidated performance metrics across all CRM systems and communication channels (e.g., combined lead conversion rates, blended call center metrics).

Automation Rules: Centralized management of automation rules, workflows, and escalation paths that leverage capabilities from both CRM systems.

Integration Health: Real-time monitoring of all CRM integrations with alerting for any data synchronization issues or API failures.

8.2 Third-Party Integration (Enhanced)
8.2.1 VoIP Integration

VoIP Providers:

Twilio Integration: Primary integration with Twilio for robust VoIP services, SMS, and call management APIs.

Plivo Integration: Alternative VoIP provider integration for redundancy and failover capabilities, ensuring business continuity.

Call Routing: Intelligent call routing and distribution based on agent availability, skills, and lead priority.

Call Quality: Real-time call quality monitoring and optimization (e.g., QoS metrics).

Cost Management: Detailed call cost tracking and optimization features.

8.2.2 Communication Integration

Communication Platforms:

Email Services: Deep integration with transactional email service providers (SendGrid, Mailgun) for system notifications, automated campaigns, and comprehensive email tracking.

SMS Services: Integration with SMS providers (Twilio, MSG91) for transactional and promotional SMS alerts.

WhatsApp Business: Full integration with WhatsApp Business API for direct, automated, and personalized client/partner communication.

Social Media: Integration with key social media platforms for lead capture, listening, and direct engagement.

Chat Platforms: Integration with live chat platforms for real-time customer support on the public website.

ðŸ“ˆ SUCCESS METRICS & KPIs (ENHANCED)
9.1 Business Metrics
9.1.1 Growth Metrics

User Acquisition: Monthly Active Users (MAU), User Growth Rate, Customer Acquisition Cost (CAC), User Retention Rate, Customer Lifetime Value (CLV).

Market Expansion: Geographic coverage (number of cities active, with specific targets for Mumbai, Bangalore, Hyderabad, etc.), Market Penetration Rate (projects completed vs. total addressable market size in active cities), Partner Acquisition Rate (new designers/vendors onboarded monthly/quarterly), Vendor Onboarding Rate (new factories onboarded), Service Area Expansion (new service types offered).

9.1.2 Financial Metrics

Revenue Performance: Gross Merchandise Value (GMV), Revenue Growth Rate, Average Order Value (AOV), Commission Revenue, Profit Margins (overall and per project/service/city/designer).

Financial Health: Cash flow management, Burn Rate, Runway, Return on Investment (ROI), Break-even analysis.

9.2 Operational Metrics
9.2.1 Platform Performance

System Performance: Uptime percentage (target: 99.9%), Page Load Times (target: <3 seconds), API Response Times (target: <500ms for core APIs), Error Rates (target: <0.1%), System Scalability metrics (concurrent users, transaction throughput, resource utilization under load).

User Experience: User Satisfaction Scores (CSAT), Net Promoter Score (NPS), User Engagement Metrics (feature adoption rates, time spent per session, module usage), Support Ticket Resolution Time.

9.2.2 Project Success Metrics

Project Performance: Project Completion Rate, On-time Delivery Percentage, On-budget Completion Rate, Quality Scores (derived from QC checks and customer feedback), Customer Satisfaction Ratings (directly linked to feedback system).

Partner Performance: Designer Performance Metrics (lead conversion rate, project success rate, average rating, earnings), Vendor Reliability Scores (on-time delivery, quality of materials), Project Manager Efficiency (project completion within budget/timeline for assigned projects), Team Productivity (tasks completed per team/individual).

9.2.3 CRM Performance Metrics (NEW)

Lead Management Metrics:

Lead Conversion Rate: Percentage of leads converted to customers (overall and segmented by source, designer, city, lead score).

Lead Response Time: Average time taken to respond to new leads (overall and per agent/designer).

Lead Quality Score: Tracking of AI-powered lead quality scoring and trends over time.

Lead Source Analysis: Performance analysis by lead source and channel (e.g., website leads conversion vs. builder partner leads conversion).

Lead Pipeline Value: Total monetary value of leads in the pipeline and their conversion rates at each stage.

CRM Efficiency:

CRM Adoption Rate: Percentage of users actively logging into and using CRM systems for their daily tasks.

Data Accuracy: Accuracy and completeness of CRM data (e.g., lead contact info, communication logs).

Integration Success Rate: Success rate of CRM integrations and data synchronization processes.

User Satisfaction: User satisfaction scores for CRM systems (e.g., ease of use, impact on productivity).

System Uptime: CRM system uptime and availability metrics.

9.2.4 Communication Metrics (NEW)

Call Performance:

Call Volume: Total number of calls made/received and call trends over time.

Call Conversion Rate: Percentage of calls resulting in specific conversions (e.g., appointment booked, lead qualified).

Call Duration: Average call duration and metrics for optimizing call efficiency.

Call Quality: Call quality scores (e.g., based on sentiment analysis or agent evaluation) and customer satisfaction with call interactions.

Agent Performance: Individual agent performance metrics for calls (e.g., calls per day, conversion rate per agent).

Multi-channel Metrics:

Channel Performance: Performance analysis by communication channel (e.g., email vs. SMS vs. WhatsApp effectiveness).

Response Time: Average response time by channel and message type.

Engagement Rate: Customer engagement rates by channel (e.g., email open rates, message reply rates).

Resolution Time: Average time to resolve issues across different communication channels.

Customer Satisfaction: Customer satisfaction scores by communication channel.

9.3 Quality Metrics
9.3.1 Service Quality

Quality Assurance: Defect Rates (per project, per phase, per material type), Quality Inspection Scores, Customer Complaint Rates, Return/Refund Rates related to quality issues, Service Level Agreement (SLA) compliance for issue resolution.

Customer Experience: Customer Satisfaction (CSAT) scores, Net Promoter Score (NPS), Customer Effort Score (CES), Review Ratings (for designers, PMs, overall Gharinto), Recommendation Rates (e.g., from "Would you recommend Gharinto?" question).

ðŸŽ¯ CONCLUSION & NEXT STEPS (ENHANCED)
10.1 Summary

The Gharinto Platform PRD V1.0 represents the definitive, most comprehensive, and highly robust roadmap for developing a world-class, end-to-end home interiors marketplace. With its central focus on an enhanced Super Admin dashboard featuring dynamic RBAC and sidebar menu configuration directly from the database (eliminating static data), coupled with advanced real-time capabilities across inventory, financials, and communications, and a sophisticated Lead Segregation Engine integrated with best-in-class Voice CRM, Gharinto is strategically positioned to revolutionize the Indian home interiors industry. The meticulous detail for each role's requirements, supported by a clear phased implementation plan, ensures a structured, secure, and successful development journey towards a truly user-centric platform.

10.2 Key Differentiators (Strengthened in V1.0 - Final Version)

Comprehensive Dynamic Role Management: The ability for Super Admin to dynamically control all permissions and sidebar menu configurations directly from the database is a powerful differentiator, enabling unparalleled flexibility, scalability, and security for managing diverse roles, including granular employee access. Absolutely no static data will be used in the frontend for these crucial configurations.

End-to-End Real-time Capabilities: Live updates are not just for progress bars, but extend across project execution, real-time chat, instant inventory synchronization, and dynamic financial transactions, providing immediate actionable insights and unparalleled transparency.

Intelligent & Integrated Lead Management: An advanced Lead Segregation Engine powered by machine learning for smart lead matching, combined with seamless integration with LeadPro CRM for comprehensive lead management and Perfex CRM with LeadPilot AI for AI-driven voice automation and call tracking, ensures superior lead nurturing and optimized designer allocation.

Transparent & Interactive Customer Journey: A highly detailed Customer Portal provides unparalleled visibility and control, with interactive elements for designs, comprehensive financial management, and a secure digital vault for all project documentation, including version control. Multi-channel communication is unified and tracked via CRM integration.

Scalable & Robust Architecture: Built on a microservices foundation with containerization (Docker/Kubernetes), advanced caching (Redis), and a hybrid database approach (PostgreSQL/MongoDB), the platform is designed for rapid growth, multi-city expansion, and enterprise-grade security with continuous monitoring and threat prevention.

User-Centric & Themed Design: A professional UI/UX adhering to a cohesive pale green, black, and green theme, ensures intuitive and engaging experiences across all roles, reflecting Gharinto's premium brand identity and attention to detail.

10.3 Implementation Priority (Refined for V1.0 Final)

Phase 1 (Months 1-3): Foundational & Core:

Critical Priority: Complete the Super Admin Dashboard (MVP) with full Dynamic RBAC & Sidebar Menu Configuration directly from the database for ALL roles. This is the foundational piece for security and flexibility. Implement core User Management.

High Priority: Develop fully functional core Admin, PM, Designer, Customer, and Vendor portals. Implement the basic Lead Segregation Engine for lead storage and assignment. Establish city-wise data filtering in Admin dashboards. Complete all Homepage elements (Header with "Get Free Quote", "Become a Partner" with role dropdown, "How It Works" process section, "Our Recent Works", and Testimonials editable from Admin panel). Refine Customer Management in Admin to include Customer ID, Project ID, and Assigned PM/Designer. Crucially, deploy the NEW Vendor components (VendorProductCatalog.js, VendorInventory.js, VendorOrderManagement.js, VendorFinancials.js) with core functionality. Integrate CRM System Foundation with LeadPro CRM and Perfex CRM (basic setup and API connectors).

Phase 2 (Months 4-6): Advanced Features & Real-time Integration:

Critical Priority: Full real-time implementation across the platform (live project updates, comprehensive chat, real-time inventory sync, live financial updates).

High Priority: Implement the advanced Lead Segregation Engine with machine learning. Deeply integrate External Voice Calls CRM API (Perfex CRM with LeadPilot AI), ensuring automated call logging, AI call assistant, and multi-channel communication tracking. Roll out detailed city-wise analytics across all Admin and PM dashboards, including specific metrics for partner/vendor performance per city. Enhance customer portal features (interactive designs, full financials, robust documents).

Phase 3 (Months 7-9): Intelligence & Optimization:

High Priority: Deploy AI/ML features for intelligent lead matching and automated design/material recommendations. Implement comprehensive security enhancements and perform in-depth performance optimizations across the entire system. Further optimize CRM intelligence for predictive lead scoring and automated workflows.

Phase 4 (Months 10-12): Scale & Expansion:

High Priority: Full multi-city operational support with regional customization. Develop enterprise features (e.g., white-label solutions). Launch the comprehensive Business Intelligence platform. Initiate the launch of native iOS and Android mobile applications. Implement multi-location CRM support and advanced CRM integrations.

10.4 Success Factors

Strong Leadership: Committed executive sponsorship and a clear, unwavering product vision.

Technical Excellence: Adherence to best-in-class software development practices, robust architecture, and continuous innovation.

User Adoption: Prioritizing intuitive user experience, seamless onboarding, and comprehensive training for all stakeholders.

Data-Driven Decisions: Implementing robust analytics and reporting to guide strategic and operational decisions.

Market Fit: Agile development with continuous market validation, competitor analysis, and rapid adaptation to evolving user needs.

Financial Sustainability: A sound business model with clear monetization strategies and prudent financial management.

10.5 Risk Mitigation

Technical Risks: Mitigated by a modular microservices architecture, rigorous automated testing, secure CI/CD pipelines, and continuous security assessments.

Market Risks: Addressed through a phased rollout, continuous user feedback loops, and proactive competitive analysis.

Operational Risks: Managed by clearly defined processes, comprehensive team training, automated workflows, and real-time monitoring with automated alerts.

Financial Risks: Controlled through conservative financial planning, transparent budget tracking, and regular financial audits.

Compliance Risks: Minimized by proactive legal review, automated compliance tools, and adherence to data protection regulations.

Integration Complexity: Managed through a phased integration approach, expert consultation on CRM APIs, and robust error handling/monitoring.

This Gharinto Platform - Comprehensive Product Requirements Document (PRD) V1.0 represents the ultimate foundational blueprint for building a successful, scalable, secure, and user-centric interior design marketplace. The detailed requirements, exhaustive use cases, comprehensive technical specifications, and clear phased implementation plan ensure all stakeholders have a precise understanding of the platform's capabilities and its ambitious roadmap, positioning Gharinto as a transformative leader in the Indian home interiors industry.

See in this Superadmin and all other roles should be configured properly and database also you suggest the best if we are ok with mongodb include that and give me perfectly and robust and clear document includes all things proeprly and perfeclyt

So you have to think properly from superadmin and his access that he can switch between states cities and adding customers and removing and all these things claerly think and give me the perfect and robust output prd with all technical information and include more and more user stories in this and develop the PRD perfeclty. Need more and more scnearios adn storeis







### 1. Introduction
- Vision, objectives, USPs, target audience
- Platform context and high-level workflows

***

### 2. Roles: Rights, Responsibilities & Access Matrix

| Role           | Responsibilities                                   | Key Access                        | Main User Stories/Scenarios            |
|----------------|----------------------------------------------------|------------------------------------|----------------------------------------|
| **Super Admin**| - Platform config<br>- All user/role management<br>- City/state switch<br>- Commission/tax setup<br>- Full override<br>- Audit & analytics<br>- Security & compliance | All admin panels, reports, entire DB, feature flags, menu systems | - Onboarding new regional teams<br>- Adjusting designer commission rates<br>- Viewing multi-city performance<br>- Managing regional/tier lists<br>- Locking down platform for maintenance<br>- Approving high-value payouts<br>- Reviewing security/audit logs<br>- Bulk partner onboarding<br>- Managing employee lifecycle|
| **Admin/Operations**| - Onboard/approve users<br>- Assign/reassign leads<br>- Manage leads/projects by city<br>- Oversee risk, financials, support<br>- Content management<br>- Regional ops | Project overview, lead dashboard, comms hub, CRM, financial modules| - Managing high-priority leads<br>- Viewing city/project benchmarks<br>- Escalating project delays<br>- Running risk analysis<br>- Sending announcements<br>- Reviewing complaint/escalation flows|
| **Project Manager (PM)** | - All project planning<br>- Timeline/resource management<br>- Procurement, PO tracking<br>- Quality control & reporting<br>- Team allocation | PM dashboard: Gantt, resource planner, QC modules, budget, communications| - Creating/adjusting Gantt charts<br>- Assigning onsite teams/resources<br>- Approving purchase orders<br>- Notifying clients of delays<br>- Scheduling inspections/checkpoints<br>- Budget & variance analysis|
| **Interior Designer (Partner)**| - Lead acquisition/marketplace<br>- Design, BOQ, proposals<br>- Client feedback, comms<br>- Material selection<br>- Wallet management | Designer portal, BOQ tool, lead/credit system, design library| - Browsing/accepting leads<br>- Generating and sending BOQ<br>- Uploading 2D/3D files<br>- Getting client approvals<br>- Managing milestone payments & withdrawals<br>- Portfolio updates|
| **Customer**  | - Tracking project progress<br>- Approving designs<br>- Managing payments<br>- Secure doc storage<br>- Comms with PM/Designer<br>- Submit feedback/complaints | Project dashboard, financials, comms, doc vault, feedback| - Viewing real-time status<br>- Reviewing design options<br>- Payment schedule management<br>- Accessing digital warranty<br>- Messaging teams or raising complaints|
| **Vendor/Supplier** | - Product catalog/inventory<br>- Order fulfillment<br>- Financial & commission tracking<br>- Quality management | Vendor portal, inventory/order modules, financial reports| - Updating stock/pricing<br>- Tracking multi-location inventory<br>- Processing orders, shipment<br>- Accessing payout/invoice dashboard<br>- Setting up stock alerts|
| **Employee** | - Granular tasks (finance, support, site)<br>- Reporting<br>- Only modules/user data permitted by Admin | Customized dashboard per role (regional, departmental restrictions)| - Qualifying new leads<br>- Supervising onsite QC<br>- Generating payroll reports<br>- Requesting temporary privileges<br>- Running attendance & leave|

***

### 3. Functional Flows & Detailed User Stories

*Each role above expands into 4-6 primary workflows, each broken down into stepwise user stories and success criteria.*

#### Example: Super Admin - Onboarding Regional Operations Head
- **Scenario**: Expanding to Hyderabad
- Steps: Access admin panel → Create Regional Head user → Assign role/city → Set permissions (API-driven) → Send onboarding credentials → Set up city configs (GST, payment methods) → Monitor onboarding status.
- **Flowchart**: [Include diagram, e.g., Onboarding Workflow]

#### Example: Designer - Lead Acquisition & Proposal
- **Scenario**: Accept lead, generate BOQ, send proposal, get approval, receive milestone payment.
- Steps: Lead market → Accept lead → Contact client (CRM-logged) → Build BOQ (material catalog) → Submit for client approval → Make changes per feedback → Receive payment → Update status.

#### Example: Customer - Project Tracking & Feedback
- **Scenario**: Viewing progress, approving milestones, issuing complaint.
- Steps: Login → Dashboard (progress, milestones) → Review next actions → Make/payment → Message PM/Designer → Access documents → Submit feedback/complaint.

***

### 4. Flowcharts & Diagrams

- **Dynamic RBAC System**: Permission/Role/Sidebar DB flow
- **Lead Segregation Engine**: Auto/manual lead assignment
- **Project Management**: Gantt/Team/Resource steps
- **Customer Progress**: Dashboard > Milestones > Payment > Feedback loop
- **Vendor Inventory/Order Flow**: PO reception > Order update > Delivery > Payment/Reconciliation
- **Comms/Notification Hub**: Channels, escalation, logging, notifications

***

### 5. Feature Access Matrix

| Feature/Module | Super Admin | Admin | PM | Designer | Customer | Vendor | Employee |
|----------------|-------------|-------|----|----------|----------|--------|----------|
| User/Role Mgmt | Full        | Approve | View | None | None | None | None |
| Project Mgmt   | Full        | Full   | Full | Assigned | View | Linked | Specific |
| Lead Mgmt      | Full        | Full   | Assigned | Acquire | None | None | Specific |
| Finance        | All         | Approve | Budget| Earnings | Payments | Payouts| Payroll |
| Comms/Notifs   | All         | All    | All | All      | All      | All    | Tasked   |
| Doc Vault      | All         | All    | Assigned | Assigned | Own     | Linked | Assigned |
| Inventory      | None        | View   | Request | Source   | View    | Manage | Specific |
| Reports/Analytics | Full     | Full   | Assigned | Own      | Own      | Own    | Specific |

***

### 6. Edge Cases, Escalations & Exception Handling
- Role-switching for emergency
- Temporary permissions (JIT access)
- Multi-region/multi-city data segregation
- Escalation path for complaints/issues
- Maintenance mode—locking access, draining sessions

***

### 7. Technical Guidance & API/Integration Notes

- **Backend**: Node.js, microservices, PostgreSQL (for core), MongoDB (for dynamic data/detailed logs), Redis cache
- **Frontend**: React + TypeScript + Vite + Tailwind, dynamic menu/sidebar from DB
- **Comms**: Socket.io for real-time updates, API-driven channels with CRM integration
- **Security**: Dynamic RBAC, E2EE, session management, audit logs, SSO & MFA
- **Integrations**: Payment gateway (Razorpay), external CRM (LeadPro/Perfex), SMS/WhatsApp (Twilio)
- **Document Storage**: AWS S3 or GCP, versioned doc vault

***

### 8. Full Appendix: 50+ Detailed User Stories & Scenario Walkthroughs

- Add at least 10 per major role, covering onboarding, advanced permissions, flows, exception cases, reporting, edge situations, real-time communication, audits, analytics, feedback, complaints, task-specific actions.

Here is a **production-ready, detailed PRD for Phase-1 of the Gharinto Platform**, perfectly structured and clearly covering all required aspects. This is tailored for immediate implementation and focused on launch-critical features, platform architecture, user roles, and initial workflows.

***

# Gharinto Platform – Product Requirements Document (PRD)
## Version: Phase-1 Production Launch

***

## 1. Executive Summary

**Gharinto** is a next-generation, technology-driven, three-sided marketplace transforming India’s home interiors sector. Targeting Homeowners, Designers, and Vendors, it emphasizes transparency, predictable timelines/costs, quality, and operational excellence.
**This PRD details Phase-1 features, user roles, architecture, and workflows for a robust MVP.**

***

## 2. Platform Vision & Goals

- **Vision:** Deliver a seamless, transparent, and efficient ecosystem for home interior projects, connecting customers with trusted designers and verified vendors.
- **Phase-1 Goals:** 
  - Launch core admin tools, role management, onboarding.
  - Deliver full project and lead management backbone.
  - Enable partner onboarding (designer/vendor).
  - Provide homeowners with a basic tracking dashboard.
  - Instil world-class security and operational best practices from day one.

***

## 3. User Roles & Permissions (Dynamic RBAC)

| Role         | Core Abilities (Phase-1)                                                                                                                |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Super Admin  | Complete system access; configure roles, commissions, permissions; set up cities; live system health; basic platform analytics.           |
| Admin        | Operations setup; onboarding of designers/vendors/employees; lead assignment; city filter; monitor financials; reroute/escalate leads.    |
| Designer     | Accept/decline leads; create designs; communicate with customers; manage project BOQ & docs; onboard team members (for test).             |
| Customer     | Register/request project; view project status; communicate with designer/PM; access digital vault (project docs, contracts, images).      |
| Vendor       | Register; list products/services; manage basic inventory; receive orders; fulfill and update order status.                                |
| Employee     | Task-specific access; support onboarding/testing for role workflows (optional, for test cities only).                                     |

- **Dynamic Role Management:** All permissions, cardinality, sidebars, menus driven via DB for total flexibility (no static FE sidebars).

***

## 4. Phase-1 Functional Modules

### 4.1 Super Admin Dashboard
- City management (add/edit/delete, regional settings).
- Global system/stats view (users, projects, leads, vendors).
- Role/permission assignment; see all active users by role/city.
- Configure commission (%), platform fees, and assignment algorithms.
- Employee lifecycle management: Add, revoke, transfer roles.
- System logs: All major changes/events with timestamps.

### 4.2 Operations Admin Panel
- View/add/approve new designers/vendors/employees.
- Assign/reassign leads & projects (auto/manual).
- Reroute projects between cities.
- City-wise dashboard: active users, leads, projects, escalations.
- Financial monitoring: Real-time transaction summary (high-level).

### 4.3 Lead & Project Management Backbone
- Unified pipeline to receive and manage all new leads (from site, referrals, campaigns).
- Segmentation: by city, project type, priority.
- Automated assignment on logic (rotate, skill, load-balancing), with manual override.
- Track each project's stage (lead, design assigned, in progress, completed).
- Trigger notifications for assignment, approvals, escalations.
- Project digital folder: docs, contracts, images, design files.
- Timeline: Gantt/phase tracker (basic, for phase-1).

### 4.4 Designer Portal
- View assigned leads, accept/decline.
- Basic project tracker (milestones, status updates, comms).
- Upload designs/BOQ, access resource vault.
- In-app chat/email with customer & admin/PM.
- Analytics: See basic lead conversion ratio, project statuses.

### 4.5 Vendor Portal
- Partner onboarding (approval workflow).
- Product/service listing, including pricing (with admin review).
- Basic inventory tracking (quantity, location, reorder, restock alert).
- Order receipt and fulfillment update flow.
- View order/payments dashboard (summary only in v1).

### 4.6 Customer Portal
- Register/view dashboard of own projects.
- See project status (milestones, assigned designer/PM, timeline).
- Digital vault: All project docs, agreements, designs.
- In-app communication with designer & admin (basic, logs preserved).
- Feedback and escalation form (routes to admin).

### 4.7 Notifications & Messaging (Core)
- All roles: System-generated and manual notifications (email/app/SMS, future WhatsApp).
- Real-time updates for key actions: assignment, project updates, document upload, approvals.
- Audit log of all comms tied to user/project.

***

## 5. Technical Architecture

**Frontend:** React v19 (TypeScript), Tailwind, roles/menus fetched from API/DB.
**Backend:** Node.js (Express or Nest), microservices for user/role, project, lead, notification.
**DB:** PostgreSQL (main, normalized), Redis (cache/sessions), S3-compatible storage for documents.
**APIs:** Secure REST (OAuth2/JWT), all permissions DB-driven; minimal hardcoding.
**Security:** MFA, SSO for admin/super admin, scheduled token expiry, audit logs, E2EE for sensitive doc transfer, role-based/attribute checks at API/middleware.

***

## 6. Phase-1 Implementation Roadmap

| Sprint (2 weeks) | Major Deliverables                                                                                                                           |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| 1-2              | Core DB schema, dynamic RBAC backend, city/role/commission setup, initial admin panel scaffolding.                                           |
| 3-4              | Lead management pipeline, project structure, initial notification system, designer dashboard (basic lead/project workflow), vendor onboarding.|
| 5-6              | Customer portal (dashboard + comms), digital vault, task lifecycles, project doc uploads, escalation/feedback flows, role switching/testing.  |
| 7-8              | Audit logging, analytics MVP (user/project/lead metrics), error handling framework, security review, production deployment ready.             |

***

## 7. Success Metrics (Phase-1)

- Onboarding: 3+ cities, 5+ designers/vendors, 10+ real user projects.
- Lead turnaround: Assignment in <10 min, project kickoff <24hr.
- Uptime: ≥99.9% (prod), full audit tracking.
- Security: No unauthorized access incidents; 100% activity auditable.
- User experience: Under 5s load time, intuitive first-use onboarding.

***

## 8. Risks / Mitigation

- **Scope Creep:** All new features gated for Phase-2+ unless emergency for launch.
- **Data Consistency:** Strict role-permission DB enforcement and test harness from Day 1.
- **Security:** Periodic audits, endpoint protection, regular review.

***

## 9. Out of Scope for Phase-1 (Future Phases)

- Real-time chat (move to phase 2).
- Full vendor inventory, order/batch/expiry tracking.
- AI/ML-powered lead assignment, dynamic segmentation.
- Advanced analytics and reporting, BI suite.
- White-labelling, multi-brand, multi-region scenario.
- Mobile apps.
- Feature flags/pilots for new advanced features.





Deliver a perfected, implementation-ready PRD tailored to Gharinto with explicit dynamic RBAC, city/state switching, database guidance (PostgreSQL primary + MongoDB secondary), detailed technical architecture, APIs, data models, security, and 70+ user stories across roles. Approach: Consolidate the provided PRD, tighten structure, add missing workflows (state/city switching, commission/tax, CRM voice, compliance), specify schemas and endpoints, enumerate scenarios with acceptance criteria, and phase the rollout.
</Thinking>GHARINTO Platform – Comprehensive Product Requirements Document (PRD) V1.0 Final

Executive Summary


Vision: Gharinto is a three-sided marketplace (Homeowners, Designers, Vendors) providing transparent, predictable, high-quality home interiors across Indian cities with end-to-end operational excellence, rigorous QA, and real-time visibility.
Objectives (Phase-1 to Phase-4):

Phase-1: Dynamic RBAC + Sidebar from DB for all roles, core portals (Admin, PM, Designer, Customer, Vendor), lead and project backbone, city-wise operations.
Phase-2: Real-time features (chat, live inventory/financial sync), deep CRM Voice integration, advanced analytics.
Phase-3: AI/ML for lead matching, recommendations, predictive risk.
Phase-4: Scale, BI suite, mobile apps, white-label.


USPs: Dynamic RBAC with DB-driven menus (no static FE), live project/financial/inventory sync, intelligent lead engine with Voice CRM, transparent customer journey, enterprise-grade security.
Target audience: Value-conscious homeowners, professional designers/PMs, material vendors, real estate developers.


Roles: Rights, Responsibilities, Access


Super Admin

Rights: Full platform control; create/manage roles/permissions; feature flags; city/state configuration; commissions/taxes; employee lifecycle; override assignments; global analytics; security/compliance; CRM administration; menu config from DB.
Key abilities: Switch context across states/cities; add/remove customers, partners, employees; bulk onboarding; temporary/JIT access; maintenance mode; approve high-value payouts; audit and system health.


Admin/Operations

Rights: Onboard/verify users; assign/reassign leads/projects; city-wise ops; risk oversight; financial approvals within limits; content and announcements; CRM work queues.


Project Manager (PM)

Rights: Timeline (Gantt), budget/PO control, resource allocation, QA workflows, client comms (CRM-synced), materials coordination.


Interior Designer (Partner)

Rights: Lead marketplace with credits, BOQ generator, proposal workflow, client collaboration, materials sourcing, digital wallet.


Customer (Homeowner)

Rights: Progress dashboard, design approvals, payments/invoices, secure doc vault, comms, feedback/disputes.


Vendor/Supplier

Rights: Catalog and inventory, PO/order fulfillment, settlements/invoices, performance metrics, returns.


Employee (Granular)

Rights: Highly scoped module access (by region/department), task-driven UIs, reporting for domain, temporary elevations via JIT.




Dynamic RBAC and Sidebar from Database


Principles:

No hardcoded roles, permissions, or sidebar menus in frontend. All fetched per session from APIs backed by DB.
RBAC + ABAC: Role permissions + attribute filters (e.g., city_id, department).
Permission granularity: API endpoints, UI components, data scopes, and actions.


Core Tables (PostgreSQL):

roles(id, name, inherits_from_role_id, description, created_at)
permissions(id, key, description)  e.g., MANAGE_PROJECTS, VIEW_FINANCIALS_CITY, EDIT_CATALOG
role_permissions(role_id, permission_id, constraint_jsonb)  e.g., { city_ids: [1,2], departments: ["sales"] }
users(id, name, email, phone, status, auth_provider, created_at)
user_roles(user_id, role_id, effective_from, effective_to)
user_attributes(user_id, key, value)  e.g., city_ids, department, tier
sidebar_items(id, key, label, icon, path, parent_id, sort, feature_flag_key)
role_sidebar(role_id, sidebar_item_id, visibility_condition_jsonb)


Dynamic Menus (MongoDB, flexible):

collection: menu_layouts

doc: { role_id, city_overrides, sections: [{label, items:[{sidebar_item_key, conditions, badge}] }] }


Rationale: Allows quick iteration of menu grouping/order per role/city without schema changes.


Sample Permission Template (JSON):

{ role: "Regional Ops", permissions: ["LEAD_ASSIGN", "PROJECT_VIEW_CITY", "PAYOUT_APPROVE_LIMITED"], constraints: { city_ids: [“MUM”, “BLR”] } }




Multi-City/State Operations


City/State Master (PostgreSQL):

states(id, name, code, gst_rules_jsonb)
cities(id, state_id, name, code, is_active, regional_settings_jsonb)


Super Admin City/State Switch:

Context applied server-side via JWT claims or session scope; enforced at query layer (Row-Level Security policies).
All analytics and lists filter by active context unless explicitly set to “All”.


Region-Specific Config:

commissions(id, role, city_id, service_type, rate, effective_from, effective_to)
taxes(id, city_id/state_id, gst_rate, cess_rate, updated_at)




End-to-End Functional Requirements (by Role)


Super Admin

User and Role Management: create/edit/deactivate users; assign roles; bulk import; view inheritance.
Dynamic RBAC: CRUD roles/permissions; attach constraints; preview as-role; simulate city context.
Sidebar/Feature Flags: drag-drop order, sectioning; AB testing flags; per-role menu variants.
Global Finance: commission/tax config; payout thresholds; gateway keys; reconciliation.
System Health: API latency, error budgets, uptime; DB health; queue backlogs; audit anomalies.
Compliance: audit trail search; export signed logs; DSR workflows; consent/versioned policies.
CRM Admin: API keys; agent routing; call policy; integration status; error queues.


Admin/Operations

Onboarding/Verification: designers/vendors/employees; KYC; docs; status lifecycle.
Lead Engine: capture → scoring → enrichment → segregation; auto/manual assignment; rebalance; SLA timers.
Project Oversight: portfolio view; risk flags; escalations; city filters; PM performance.
Finance Approvals: payouts under threshold; refund approvals; dispute handling.
Communication Hub: announcements; channel DMs; knowledge base; SLA/reporting.


PM

Gantt/timeline; dependencies; milestones; variance alerts.
Budget control; PO approvals (limits); change orders.
Resource allocation; conflicts; utilization; skill tagging.
QA: digital checklists, defects, photos, SLAs, scoring.
CRM Comms: click-to-call; logs; follow-ups; analytics.


Designer

Lead marketplace with credits; AI lead score; follow-up automations.
BOQ generator with material catalog; margin optimization; proposals.
Design studio: 2D/3D management; versioning; annotations; client approvals.
Wallet: earnings; withdrawals; taxes; statements.


Customer

Progress dashboard; milestones; media gallery.
Approvals; payments (Razorpay); invoices/taxes.
Unified comms; scheduling; feedback; disputes.
Digital vault: contracts, BOQ, specs, warranties.


Vendor

Catalog: specs, images, pricing, categories; bulk CSV.
Inventory: multi-location, low-stock alerts, batch/expiry.
Orders: PO → fulfill → ship → deliver; returns.
Financials: settlements; invoices; TDS/GST docs; reports.


Employee

Role-scoped UI: task lists, queues; regional/departmental filters.
Automation: macros, templates; scheduled jobs.
Reporting: domain-specific dashboards; exports.




Lead, Project, Payment, Procurement Lifecycles


Lead Lifecycle:

Intake → Enrichment → Scoring → Segregation (city, skill, load, performance) → Assignment → Designer contact (CRM voice) → Proposal/BOQ → Conversion or Lost → Feedback loop.


Project Lifecycle:

Converted → Plan (Gantt) → Procure → Execute (QA checkpoints) → Handover → Warranty.


Payment Lifecycle:

Milestone schedule → Invoice → Payment (Razorpay) → Commission split (designer/PM) → Vendor payout → Reconciliation.


Procurement Lifecycle:

BOQ items → RFQ/PO → Vendor confirm → Ship/Deliver → QA of goods → Invoice match → Settlement.




Technical Architecture


Frontend: React 19+ (TS), Tailwind, SWR/React Query; App Router; shadcn/ui; Recharts for charts; Socket.io client. Menus/permissions fetched on layout load; guard at route and component level.
Backend: Node.js (NestJS recommended), microservices with API gateway.

Services: Auth/Users, RBAC, Leads/CRM, Projects, Procurement, Vendors, Finance, Notifications, Media, Analytics.


Databases:

PostgreSQL (primary, relational): users, roles, permissions, projects, tasks, milestones, POs, invoices, payments, commissions, taxes, city/state, disputes, audits (indexed).
MongoDB (secondary, flexible): BOQ documents, design metadata, menu_layouts, activity feeds, call transcripts, chat logs, checklists templates, dynamic settings, versioned proposals.
Rationale: Postgres for integrity and joins; Mongo for document-style, evolving structures.


Caching/Queues: Redis (caching RBAC lookups, session state, rate-limits); Kafka or Redis Streams for events (lead.assigned, project.updated, payment.settled, call.logged).
File Storage: S3/GCS with signed URLs; antivirus scanning on upload; lifecycle policies.
Integrations:

CRM: LeadPro (lead mgmt), Perfex + LeadPilot AI (voice and AI follow-ups)
VoIP: Twilio/Plivo (click-to-call, recording, transcription)
Payments: Razorpay (webhooks, refunds)
Email/SMS/WhatsApp: SendGrid/Mailgun, Twilio/MSG91, WhatsApp Business


Observability: OpenTelemetry, Prometheus, Grafana; ELK for logs; SLO dashboards.


Data Model (Selected)


PostgreSQL key tables:

projects(id, customer_id, pm_id, designer_id, city_id, status, budget_planned, budget_actual, start_date, end_date)
project_milestones(id, project_id, name, due_date, amount, status, approved_at)
purchase_orders(id, project_id, vendor_id, status, total, created_by, approved_by)
invoices(id, project_id, type, amount, gst_jsonb, status, razorpay_ref, issued_at, paid_at)
wallets(id, user_id, type, balance)
wallet_transactions(id, wallet_id, type, amount, ref_type, ref_id, tax_jsonb, status)
leads(id, city_id, source, budget_range, property_type, score, status, assigned_designer_id)
audits(id, user_id, action, entity, entity_id, meta_jsonb, created_at)


MongoDB collections:

boq_docs: { project_id, items:[{sku, name, qty, unit, price, vendor_suggestions}], pricing: {subtotal, margin, tax, total}, versions:[…] }
design_files: { project_id, files:[{type, url, version, annotations}] }
menu_layouts: { role_id, city_overrides, sections:[{label, items:[{sidebar_item_key,…}]}] }
checklists_templates: { phase, items:[{label, required_photo, threshold}] }
call_transcripts: { lead_id/project_id, call_id, text, sentiment, agent, recording_url, created_at }




API Surface (Representative)


Auth/RBAC:

POST /auth/login; POST /auth/mfa/verify
GET /me/context; PATCH /me/context (switch city/state)
GET /rbac/roles; POST /rbac/roles; PATCH /rbac/roles/:id
GET /rbac/permissions; POST /rbac/roles/:id/permissions
GET /menu (returns sidebar structure for current user/context)


Leads/CRM:

POST /leads; GET /leads?city=…&status=…; POST /leads/:id/assign
POST /leads/:id/contact (logs to CRM); GET /crm/calls?lead_id=…


Projects:

POST /projects; GET /projects?city=…; PATCH /projects/:id/status
GET /projects/:id/gantt; PATCH /projects/:id/gantt
POST /projects/:id/milestones/:mid/approve


Procurement/Vendors:

POST /vendors; GET /vendors
POST /po; PATCH /po/:id/status
GET /inventory?vendor_id=…; PATCH /inventory/:id


Finance:

POST /payments/collect (Razorpay order)
POST /webhooks/razorpay
GET /wallet; POST /wallet/withdraw
GET /settlements?vendor_id=…&status=…


Media/Documents:

POST /upload/sign; POST /media/attach
GET /vault?project_id=…


Admin:

POST /users; PATCH /users/:id/status
GET /analytics/overview?city=…; GET /system/health




Real-Time Events (Pub/Sub)


lead.created, lead.assigned, lead.status_changed
project.created, project.milestone.approved, project.timeline.updated
procurement.po.created, po.status.changed, inventory.updated
finance.payment.succeeded, payout.scheduled
comm.message.sent, crm.call.logged
audit.logged, security.alert


Security, Privacy, Compliance


AuthN/AuthZ: MFA for privileged roles; JWT with short TTL + refresh; SSO for employees; device fingerprinting; session concurrency limits.
RLS/ABAC: City and department enforced at DB query layer; all endpoints re-validate scope.
Crypto: TLS everywhere; AES-256 at rest; KMS-managed keys; E2EE for sensitive chat.
Audit: Immutable append-only logs; signed exports; anomaly detection on admin actions.
Privacy: GDPR-aligned DSRs; retention schedules; consent tracking; call recording consent.
AppSec: Rate limiting, WAF, IDS/IPS, SBOM, dependency scans, periodic pen tests.


NFRs, SLOs, Capacity


Availability: ≥99.9%
Performance: p95 API < 500 ms core; dashboards initial load < 3 s
Scalability: 10k concurrent active users; 1M+ events/day
Data: PITR backups (RPO < 15 min), RTO < 1 hr
Observability: Trace coverage ≥ 90% on critical paths


Analytics & KPIs


Growth: MAU, city coverage, partner acquisition, activation rates
Financial: GMV, AOV, commission revenue, margins, burn, runway
Ops: Lead assignment SLA, on-time delivery, on-budget rate, QC defect rate
CRM Voice: call volume, conversion, duration, sentiment, agent performance
UX: CSAT, NPS, time-to-value, task success rates
System: uptime, error rate, latency, queue lag


Implementation Plan


Phase-1 (Months 1–3): Dynamic RBAC + Sidebar from DB, core portals, city-wise filters, lead storage/assignment MVP, homepage CMS basics, vendor core modules, CRM connectors (base). Highest priority.
Phase-2 (Months 4–6): Real-time chat/updates/inventory/financials; advanced Lead Engine; full Perfex + LeadPilot AI; city analytics; enriched customer portal.
Phase-3 (Months 7–9): AI/ML matching, predictive risk/cost; security hardening; performance tuning; CRM intelligence.
Phase-4 (Months 10–12): Multi-city scale with regional customizations; BI suite; native mobile; white-label; advanced CRM support.


Test Strategy


Unit: services, validators, guards (RBAC/ABAC)
Contract/API: OpenAPI tests, schema validation
E2E: Critical flows (city switch, lead assignment, milestone payment)
Security: AuthZ bypass tests, audit integrity, webhook HMAC
Load: peak concurrency on lead assignment, dashboards, inventory sync
UAT: Per role, per city; scenario-driven sign-off


Edge Cases, Escalations, Exception Handling


Forced role-switch with JIT access approvals and auto-revocation
Cross-city project transfers with commission/tax recompute
Partial refunds; dispute mediation with escrow-like holds
CRM outage fallback: queue-and-retry with dead-letter visibility
Payment webhook retries/idempotency; duplicate prevention
Inventory race conditions: optimistic versioning + conflict resolution


70+ Detailed User Stories (10 per role)


Super Admin

SA1: As SA, I can switch between states/cities and see analytics adjust instantly. Acceptance: City filter persists to all dashboards until changed.
SA2: As SA, I can create a role inheriting from another with added permissions. Acceptance: Inherited and explicit permissions are visible and testable via “preview as role.”
SA3: As SA, I can configure sidebar sections and order for a role and push live without redeploy. Acceptance: Role-holding user sees updated menu on next reload.
SA4: As SA, I can bulk onboard designers via CSV with validation errors report. Acceptance: Invalid rows reported; valid rows created.
SA5: As SA, I can set designer and PM commission per city and service type with effective dates. Acceptance: New commissions apply to subsequent milestones.
SA6: As SA, I can enforce MFA per role and view compliance status. Acceptance: Non-compliant users prompted at next login.
SA7: As SA, I can enable maintenance mode with a banner and timed end. Acceptance: Non-admins get read-only or lockout based on flag.
SA8: As SA, I can approve payouts above admin limit with dual-approval. Acceptance: Payout proceeds only after two approvers.
SA9: As SA, I can view tamper-evident audit logs and export signed reports. Acceptance: Signature verifies integrity.
SA10: As SA, I can grant JIT access to a module for 2 hours. Acceptance: Access auto-revokes and is logged.


Admin/Operations

AD1: As Admin, I can approve a vendor after KYC validation with checklist. Acceptance: Status changes to Active; notifications sent.
AD2: As Admin, I can assign a high-priority lead to top-performing designer in that city. Acceptance: Assignment logged with reason.
AD3: As Admin, I can rebalance active leads to reduce SLA breaches. Acceptance: SLAs improve; reassignments tracked.
AD4: As Admin, I can escalate a delayed project to PM’s manager with SLA. Acceptance: Timer starts; reminders sent; resolution logged.
AD5: As Admin, I can schedule a city-specific announcement. Acceptance: Only users in that city see it with read receipt.
AD6: As Admin, I can approve vendor payout under my limit, otherwise request SA approval. Acceptance: Threshold enforced.
AD7: As Admin, I can reassign a project to another city with tax/commission recalculated. Acceptance: All downstream schedules updated.
AD8: As Admin, I can view complaint queues and assign mediators. Acceptance: SLA timers and outcomes recorded.
AD9: As Admin, I can import homepage testimonials and galleries. Acceptance: Content appears on public site; versioned.
AD10: As Admin, I can place a test call via CRM to validate agent routing. Acceptance: Call logged with recording link.


Project Manager

PM1: As PM, I can create a Gantt with dependencies and critical path highlighting. Acceptance: Critical path visible; date shifts propagate.
PM2: As PM, I receive alerts when actuals exceed planned budgets by threshold. Acceptance: Alert banner and email.
PM3: As PM, I can approve a PO up to my limit; higher requires Admin/SA. Acceptance: PO state transitions reflect approvals.
PM4: As PM, I can assign a site supervisor based on availability/skills. Acceptance: Conflict warnings shown.
PM5: As PM, I can log QA inspection with photos and mark defects with severity. Acceptance: Defect tickets created with SLA.
PM6: As PM, I can send a CRM call link to customer and auto-log the call. Acceptance: Recording/transcript attached in timeline.
PM7: As PM, I can issue a change order requiring customer e-sign. Acceptance: Project budget and milestones adjust on sign.
PM8: As PM, I can subscribe stakeholders to milestone notifications. Acceptance: All subscribers notified on status change.
PM9: As PM, I can request temporary access to Finance module. Acceptance: Admin grants; auto-revokes.
PM10: As PM, I can export weekly progress report (PDF) per project. Acceptance: Snapshot with charts and photos.


Designer (Partner)

DS1: As Designer, I can filter leads by city/budget/style and set alerts. Acceptance: Alert triggers on new matching leads.
DS2: As Designer, I can top-up credits via Razorpay and see instant wallet update. Acceptance: Idempotent on webhook retries.
DS3: As Designer, I can generate a BOQ from catalog with live prices. Acceptance: Total auto-calculated with taxes/margins.
DS4: As Designer, I can propose discounts and simulate margin impact. Acceptance: Margin KPI updates.
DS5: As Designer, I can send proposal for client e-approval. Acceptance: Version locked; e-sign captured.
DS6: As Designer, I can upload 3D renders and collect threaded feedback. Acceptance: Versioned commentary timeline.
DS7: As Designer, I can request material samples from vendors. Acceptance: RFQ ticket created and tracked.
DS8: As Designer, I can track conversion funnel from accepted to converted. Acceptance: Funnel chart available.
DS9: As Designer, I can request payout of earned milestones. Acceptance: Withdrawal workflow starts with SLA.
DS10: As Designer, I can view city-specific performance benchmarks. Acceptance: Anonymized comparisons shown.


Customer

CU1: As Customer, I can see an overall progress bar and next 7 days plan. Acceptance: Syncs with PM Gantt.
CU2: As Customer, I can approve designs with a digital signature. Acceptance: Lock + timestamp + version link.
CU3: As Customer, I can pay a milestone via UPI/card and get GST invoice. Acceptance: Payment state updates in real time.
CU4: As Customer, I can message PM/Designer and attach images. Acceptance: Stored with access controls.
CU5: As Customer, I can raise a dispute and see SLA/resolution owner. Acceptance: Status timeline visible.
CU6: As Customer, I can download all project docs from the vault. Acceptance: Bundled zip with index.
CU7: As Customer, I get alerts when new site photos are posted. Acceptance: Mobile/email notification with preview.
CU8: As Customer, I can schedule a video consult. Acceptance: Calendar invite + CRM log.
CU9: As Customer, I can request a refund citing policy clause. Acceptance: Approval flow and timeline visible.
CU10: As Customer, I can view warranty docs and expiries with reminders. Acceptance: Reminders scheduled.


Vendor

VN1: As Vendor, I can bulk-upload products with validation. Acceptance: Errors per row; partial success allowed.
VN2: As Vendor, I can manage multi-location stock and set low-stock thresholds. Acceptance: Alerts fired via chosen channel.
VN3: As Vendor, I can accept a PO and provide ETA. Acceptance: Status changes; stakeholders notified.
VN4: As Vendor, I can upload shipping proof and tracking number. Acceptance: Delivery timeline visible to PM.
VN5: As Vendor, I can process returns and adjust stock/settlement. Acceptance: Credit notes generated.
VN6: As Vendor, I can see settlement statements and download invoices. Acceptance: CSV/PDF exports available.
VN7: As Vendor, I can set promotional pricing for a period. Acceptance: Catalog pricing rules apply within window.
VN8: As Vendor, I can see category performance and defects rate. Acceptance: Drill-down to affected POs.
VN9: As Vendor, I can manage batch/expiry and get alerts. Acceptance: Upcoming expiries list.
VN10: As Vendor, I can request catalog review by Admin. Acceptance: Change log maintained.


Employee (Scoped)

EM1: As Lead Qualifier, I can update lead stage with mandatory notes. Acceptance: Transition rules enforced.
EM2: As Finance Assistant, I can reconcile payments with bank statements. Acceptance: Exceptions queue maintained.
EM3: As Site Supervisor, I can complete QA checklist with photos. Acceptance: Geo/timestamp validation.
EM4: As Support Agent, I can respond to customer tickets within SLAs. Acceptance: SLA timers and canned responses.
EM5: As Ops Analyst, I can schedule city ops reports weekly. Acceptance: Delivery to stakeholders via email.
EM6: As HR Coordinator, I can onboard an employee and assign role. Acceptance: MFA enforcement checked.
EM7: As Procurement Exec, I can create RFQs and compare vendor offers. Acceptance: Awarded/declined statuses.
EM8: As Compliance Officer, I can export audit logs by time window. Acceptance: Signed hashes validated.
EM9: As Regional Support, I see only my city’s data. Acceptance: Attempts to access other cities are denied and logged.
EM10: As Content Editor, I can update homepage sections with review/approval. Acceptance: Draft → Review → Publish flow.




Monitoring, Alerts, Runbooks


Alerts: lead assignment lag > SLA, payment webhook failures, CRM API errors, inventory sync conflicts, high error rate.
Runbooks: CRM outage fallback, Razorpay webhook replay, PO stuck-in-processing, city transfer checklist, audit export.


Acceptance Criteria for Phase-1 Done


All roles authenticate with scoped menus from DB.
Super Admin can switch city/state, create/assign roles, configure menus and commissions/taxes, and preview as role.
Lead intake and assignment working end-to-end; basic PM/Designer/Customer flows operational.
Vendor core (catalog, inventory, PO updates) functional.
Payments live with invoices, wallet updates; webhooks idempotent.
Audit logs present for sensitive actions; exports signed.

This PRD is structured for immediate implementation with explicit dynamic RBAC, multi-city operations, dual-database guidance (PostgreSQL + MongoDB), service/API surfaces, events, security posture, and deep scenario coverage. It aligns with the final specification goals and adds the needed clarity to ship Phase-1 confidently and scale into subsequent phases.
Summary

I consolidated and tightened your PRD, added explicit schemas for RBAC/menus, city/state dynamics, dual-database strategy, concrete APIs/events, security/NFRs, and 70 user stories across all roles. This version is implementation-ready and phased for delivery. If you want, I can turn this into a Notion/MDX document with collapsible sections or generate initial ERDs/sequence diagrams next.