# NOLT Finance - Application Process & Approval Workflow

This document outlines the operational lifecycle of applications within the NOLT system, detailing the specific roles, administrative onboarding, and the sequential stages of the approval pipeline.

---

## 1. Role Matrix & Access Control

The system implements a strict Role-Based Access Control (RBAC) model to ensure data privacy and operational integrity.

| Role | Visibility Scope | Functional Approval Action |
| :--- | :--- | :--- |
| **Super Admin** | Global (All Modules) | Full system configuration, user provisioning, **Form Design (Dynamic Fields)**, and overriding any gate. |
| **Sales Manager** | Global (All Modules) | **Approval Gate 1**: Review initial entries, **Re-assign** owners, and **Decline** applications. |
| **Sales Staff / Officer** | Ownership-based | **Entry Node**: Gather requirements; rectify **Returned** applications. Captures **IPPIS Number/MDA** for IPPIS loans. |
| **Customer Experience** | Global (All Modules) | **Approval Gate 2**: Document vetting and customer validation. |
| **Credit**| Loan Records (Post-CX) | **Credit Check (Loans)**: Performs risk assessment. **Must supply Eligible Amount** before moving record to **Internal Audit**. |
| **Internal Control** | Global (All Modules) | **Approval Gate 3 (Audit)**: Final compliance audit on logs, eligible amount assessment, and decisions. |
| **Finance Team** | Global (Audit Passed Only) | **Execution Gate**: Confirmation of fund movement (Payouts or Receipt Receipt). |

---

## 2. Dynamic Intake Customization (Super Admin Only)

The **Form Designer** module allows Super Administrators to define the specific data points required for different application types without developer intervention.

*   **Custom Fields**: Define labels, types (Text, Number, Date, Selection, File), and requirement status.
*   **Workflow Mapping**: Assign specific form versions to either the **Loan** or **Investment** intake pipelines.
*   **Portal Sync**: Configurations are synced in real-time with the Applicant Portal, ensuring the front-end intake matches back-end review expectations.

---

## 3. Sequential Approval Workflows

The system diverges based on the product type to ensure appropriate compliance milestones.

### A. Loan Application Flow (5 Stages)
1.  **Submission**: Sales Staff gathers requirements based on the current **Form Designer** configuration. For **IPPIS** products, the **IPPIS Number** and **MDA** are mandatory.
2.  **Customer Validation**: CX verifies ID and address documents.
3.  **Credit Check**: The **Credit** role performs risk assessment and determines the final **Eligible Amount**.
4.  **Request For Payment**: Internal Control audits the assessment, then Finance reviews payout instructions.
5.  **Disbursed**: Final confirmation of fund transfer.

### B. Investment Application Flow (4 Stages)
1.  **Submission**: Lead capture and principal selection.
2.  **Customer Validation**: CX verifies identity and rollover preferences.
3.  **Payment Verification**: Finance confirms the actual receipt of the investment principal.
4.  **Issue Investment Certificate**: Final stage where the legal investment document is generated and dispatched.

---

## 4. Status Labeling Convention

*   **Internal Audit**: The operational state where Internal Control performs final compliance checks (Post-Credit assessment for loans).
*   **Pending Disbursement**: Awaiting Finance Team confirmation (Inbound for Investments, Outbound for Loans).
*   **Approved**: Final finalized state (Disbursed or Certificate Issued).