# NOLT Approval Workflow - Implementation Guide

This guide explains how the NOLT approval workflow has been implemented in the system.

## Overview

The system now implements a sequential approval workflow with role-based gates, matching the documented process for Loan and Investment applications.

## Files Created/Modified

### 1. **New Files**

#### `/utils/workflowManager.ts`
Central workflow management module that defines:
- **LOAN_WORKFLOW**: 5-stage approval process for loans
- **INVESTMENT_WORKFLOW**: 4-stage approval process for investments
- Helper functions for stage navigation, permission checks, and action validation

Key Functions:
```typescript
canViewApplication(userRole, applicationType, applicationOwnerId, userId)
canPerformAction(userRole, currentStatus, applicationType, action)
getNextStatus(currentStatus, applicationType, action)
getCurrentStage(status, applicationType)
getAvailableActions(userRole, currentStatus, applicationType, eligibleAmount)
canProceedFromCreditCheck(eligibleAmount) // Credit gate validation
```

### 2. **Modified Files**

#### `/utils/rbac.ts`
Updated permissions to match approval gates:
- `APPROVE_GATE_1`: Sales Manager approval (Initial Review)
- `APPROVE_GATE_2`: Customer Experience (Document Validation)
- `CREDIT_CHECK`: Credit team (Risk Assessment - Loans only)
- `APPROVE_GATE_3`: Internal Control (Final Audit)
- `APPROVE_GATE_FINANCE`: Finance team (Execution)
- `VIEW_INVESTMENTS`: All roles except Credit
- `VIEW_LOANS`: All roles
- `FORM_BUILDER`: Super Admin only (Dynamic Field Configuration)

Added helper functions:
```typescript
canApproveAtGate(userRole, gateNumber)
hasGlobalVisibility(userRole)
isLoanOnlyRole(userRole)
isOwnershipBased(userRole)
getVisibilityScopeDescription(userRole)
```

## Workflow Stages

### Loan Application Flow (5 Stages)

| Stage | Status | Gatekeepers | Required Actions |
|-------|--------|-------------|------------------|
| 1. Submission | `Pending Review` | Sales Manager, Super Admin | Initial review, can reassign or decline |
| 2. Customer Validation | `Docs Verification` | Customer Experience, Super Admin | Verify ID and address documents |
| 3. Credit Check | `Internal Audit` | Credit, Super Admin | **Must supply Eligible Amount** |
| 4. Request For Payment | `Pending Disbursement` | Internal Control, Finance, Super Admin | Audit assessment, review payout |
| 5. Disbursed | `Approved` | Finance, Super Admin | Confirm fund transfer |

**Special Requirements:**
- For **IPPIS** loans: IPPIS Number and MDA must be captured by Sales Staff
- **Credit Check Stage**: System blocks progression unless Eligible Amount is supplied
- **Ownership**: Sales Officers can only see their own applications
- **Credit Team**: Can only view Loan applications (post-Customer Validation)

### Investment Application Flow (4 Stages)

| Stage | Status | Gatekeepers | Required Actions |
|-------|--------|-------------|------------------|
| 1. Submission | `Pending Review` | Sales Manager, Super Admin | Lead capture, principal selection |
| 2. Customer Validation | `Docs Verification` | Customer Experience, Super Admin | Verify identity, rollover preferences |
| 3. Payment Verification | `Pending Disbursement` | Finance, Internal Control, Super Admin | Confirm receipt of principal |
| 4. Certificate Issued | `Approved` | Finance, Super Admin | Generate and dispatch certificate |

## Role Matrix & Visibility

| Role | Visibility Scope | Can View Investments | Can View Loans | Approval Authority |
|------|-----------------|---------------------|----------------|-------------------|
| **Super Admin** | Global (All Modules) | ✅ | ✅ | All gates (override) |
| **Sales Manager** | Global (All Modules) | ✅ | ✅ | Gate 1, Reassign, Decline |
| **Sales Officer/Staff** | Ownership-based | ✅ (own only) | ✅ (own only) | Entry/Edit on Returned |
| **Customer Experience** | Global (All Modules) | ✅ | ✅ | Gate 2, Decline |
| **Credit** | Loan Records (Post-CX) | ❌ | ✅ | Credit Check gate (Loans only) |
| **Internal Control** | Global (All Modules) | ✅ | ✅ | Gate 3, Decline |
| **Finance** | Global (Audit Passed) | ✅ | ✅ | Execution Gate |

## Implementation Steps for Components

### Step 1: Import Workflow Manager

```typescript
import {
  canViewApplication,
  canPerformAction,
  getNextStatus,
  getCurrentStage,
  getAvailableActions,
  canProceedFromCreditCheck,
  getStatusBadgeStyle
} from '../utils/workflowManager';
```

### Step 2: Check Visibility

```typescript
const canView = canViewApplication(
  currentUser.role,
  application.type,
  application.ownerId,
  currentUser.id
);

if (!canView) {
  return <AccessDenied />;
}
```

### Step 3: Get Available Actions

```typescript
const actions = getAvailableActions(
  currentUser.role,
  application.status,
  application.type,
  application.eligibleAmount // Required for Credit Check validation
);

// actions array will contain: ["approve", "decline", "return", "edit", "reassign", "set_eligible_amount"]
```

### Step 4: Handle Actions

```typescript
const handleApprove = () => {
  // For Credit Check, validate Eligible Amount first
  if (application.type === "Loan" && application.status === "Internal Audit") {
    if (!canProceedFromCreditCheck(application.eligibleAmount)) {
      alert("Eligible Amount must be set before proceeding");
      return;
    }
  }

  const nextStatus = getNextStatus(application.status, application.type, "approve");
  // Update application status to nextStatus
};

const handleDecline = () => {
  const nextStatus = getNextStatus(application.status, application.type, "decline");
  // Update application status to "Declined"
};

const handleReturn = () => {
  const nextStatus = getNextStatus(application.status, application.type, "return");
  // Update application status to "Returned"
};
```

### Step 5: Display Current Stage Info

```typescript
const currentStage = getCurrentStage(application.status, application.type);

return (
  <div>
    <h3>{currentStage?.label}</h3>
    <p>{currentStage?.description}</p>
    {currentStage?.requiredActions && (
      <ul>
        {currentStage.requiredActions.map(action => (
          <li key={action}>{action}</li>
        ))}
      </ul>
    )}
  </div>
);
```

## Special Handling

### Credit Check - Eligible Amount Requirement

```typescript
// In Credit view for Loan applications at Internal Audit stage
const [eligibleAmount, setEligibleAmount] = useState(application.eligibleAmount || "");

const canApprove = canProceedFromCreditCheck(eligibleAmount);

<input
  type="text"
  value={eligibleAmount}
  onChange={(e) => setEligibleAmount(e.target.value)}
  placeholder="Enter Eligible Amount"
  required
/>

<button
  onClick={handleApprove}
  disabled={!canApprove}
>
  Approve & Move to Payment
</button>
```

### Ownership Filtering for Sales Staff

```typescript
// Filter applications based on visibility rules
const visibleApplications = applications.filter(app => 
  canViewApplication(currentUser.role, app.type, app.ownerId, currentUser.id)
);
```

### Credit Team - Loans Only

```typescript
// In navigation or view filtering
import { isLoanOnlyRole } from '../utils/rbac';

if (isLoanOnlyRole(currentUser.role)) {
  // Redirect from Investments page to Loans
  if (currentPath === '/investments') {
    navigate('/loans');
  }
}
```

## Status Labeling Convention

- **Internal Audit**: Final compliance checks by Internal Control (Post-Credit for loans)
- **Pending Disbursement**: Awaiting Finance confirmation
  - Loans: Outbound payment to customer
  - Investments: Inbound payment from customer
- **Approved**: Final state
  - Loans: `Disbursed`
  - Investments: `Certificate Issued`
- **Declined**: Application rejected at any gate
- **Returned**: Sent back to previous stage or Sales for corrections

## Database Schema Requirements

Ensure your `form_submissions` table includes:

```sql
-- Add if not exists
ALTER TABLE form_submissions 
ADD COLUMN IF NOT EXISTS eligible_amount TEXT,
ADD COLUMN IF NOT EXISTS ippis_number TEXT,
ADD COLUMN IF NOT EXISTS mda TEXT,
ADD COLUMN IF NOT EXISTS current_stage_id TEXT,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_submissions_assigned_to ON form_submissions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON form_submissions(status);
```

## Next Steps

1. ✅ Workflow manager created
2. ✅ RBAC permissions updated
3. ⏳ Update InvestmentView component to use workflow actions
4. ⏳ Update LoanView component with Credit Check validation
5. ⏳ Add Eligible Amount field to Loan detail view
6. ⏳ Implement ownership filtering in data queries
7. ⏳ Add visual workflow stepper component
8. ⏳ Update status transitions in approval handlers
9. ⏳ Add audit logging for workflow transitions
10. ⏳ Create admin interface for reassignment

## Testing Checklist

- [ ] Sales Officer can only see own applications
- [ ] Sales Manager can reassign applications
- [ ] Customer Experience can approve/decline at Gate 2
- [ ] Credit team cannot see Investment applications
- [ ] Credit Check blocks without Eligible Amount
- [ ] Internal Control can access all applications
- [ ] Finance can execute final payment confirmation
- [ ] Super Admin can override any gate
- [ ] Status transitions follow defined workflow paths
- [ ] IPPIS fields captured for IPPIS loans

## Support

For questions or issues with the workflow implementation, refer to:
- `/utils/workflowManager.ts` - Workflow logic
- `/utils/rbac.ts` - Permission checks
- This implementation guide
