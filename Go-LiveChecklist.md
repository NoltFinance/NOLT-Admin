# NOLT Finance - Production Go-Live Checklist

This document outlines the technical and operational tasks required to transition the current frontend prototype into a fully functional, secure, and scalable production environment.

---

## 1. Infrastructure & Environment
- [ ] **CI/CD Pipeline:** Set up automated workflows (GitHub Actions) for linting, testing, and deployment.
- [ ] **Environment Variables:** Securely configure `process.env.API_KEY` using a Secret Manager.

## 2. Authentication & Security
- [ ] **Internal Control Access:** Verify that the IC role can globally view all request types.
- [ ] **Finance Role Scoping:** Ensure the Finance team *only* sees records in the `Pending Disbursement` or `Approved` statuses.
- [ ] **Credit Role Scoping:** Ensure the Credit team is rebranded from "Credit Manager" to "Credit" and restricted to Loan modules.
- [ ] **MFA Enforce:** Enforce Multi-Factor Authentication for all roles via the Microsoft Authenticator binding flow.
- [ ] **Form Designer RBAC:** Strictly verify that the "Form Designer" link and module are inaccessible to any role except **Super Admin**.

## 3. Data & Operation Log Integrity
- [ ] **Credit Assessment Validation:** Ensure the system blocks the **Credit** role from approving a loan if the **Eligible Amount** field is empty.
- [ ] **IPPIS Data Integrity:** For IPPIS loan products, verify that **IPPIS Number** and **MDA** fields are correctly mapped from the applicant portal.
- [ ] **Audit Pass Transitions:** Verify that "Final Audit Pass" successfully transitions state to `Pending Disbursement`.
- [ ] **Finance Finalization:** Verify that Finance disbursement confirmation successfully sets status to `Approved`.
- [ ] **Mandatory Field Validation:** Ensure the backend API rejects status changes to `Declined`, `Returned`, or `Rejected` if the `comment` field is empty.

## 4. UI/UX Consistency
- [ ] **Conditional IPPIS Section:** Verify the "Employment Details (IPPIS)" section only renders for IPPIS loan products.
- [ ] **Eligible Amount Display:** Ensure subsequent roles (IC, Finance) can clearly see the Credit-determined Eligible Amount in the details view.
- [ ] **Steppers:** Verify that the 5-stage stepper correctly highlights the "Request For Payout" node when in `Pending Disbursement`.
- [ ] **Role-Based CTA Masking:** Ensure that the "Confirm Fund Disbursement" button is *only* visible to Finance and Super Admin roles.
- [ ] **Form Builder Preview:** Test the "Form Preview" mode in the Form Designer to ensure visual consistency with the production applicant portal.

## 5. Compliance & Legal
- [ ] **PII Encryption:** Ensure BVN/NIN and IPPIS Number fields are encrypted at the database level (AES-256).
- [ ] **Audit Export:** Ensure the CSV export tool includes the flattened Operation Log history, IPPIS details, and Eligible Amount for compliance reporting.
- [ ] **Form History:** Implement versioning for custom forms so that existing applications are tied to the form version used at the time of submission.