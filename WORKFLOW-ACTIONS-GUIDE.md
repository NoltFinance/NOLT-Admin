# Workflow Actions Implementation Guide

## Overview

Complete implementation of the four core workflow actions for Investment and Loan application management:

1. **Reassign** - Transfer application ownership
2. **Return to Previous Node** - Send back for corrections
3. **Approve and Continue** - Advance to next stage
4. **Decline Application** - Reject application

---

## 1. Reassignment Feature

### Purpose
Allows Sales Managers and Super Admins to transfer application ownership to another team member.

### Implementation

#### UI Components
- **Reassign Button**: Opens modal with user selection
- **Reassign Modal**: 
  - User dropdown (filtered to exclude current user)
  - Information notice about the action
  - Confirm/Cancel buttons

#### Backend Logic
```typescript
// services/workflowService.ts
export async function reassignApplication(
  submissionId: string,
  newOwnerId: string,
  userRole: UserRole
): Promise<{ success: boolean; error?: string }>
```

#### Access Control
- **Allowed Roles**: Sales Manager, Super Admin
- **Restriction**: Cannot reassign to self

#### Operation Flow
1. User clicks "Reassign Owner" button
2. Modal opens with available users list
3. User selects new owner from dropdown
4. Confirms reassignment
5. Database updates `reviewed_by` field
6. Operation logged in history
7. Application list refreshes

#### Database Update
```sql
UPDATE form_submissions
SET reviewed_by = 'new_user_id'
WHERE id = 'submission_id'
```

---

## 2. Return to Previous Node

### Purpose
Sends application back to the previous workflow stage for corrections or additional information.

### Implementation

#### UI Components
- **Return Button**: Opens action modal
- **Action Modal**: 
  - Comment textarea (required)
  - Confirm/Discard buttons
  - Mode indicator (Return vs Decline)

#### Workflow Logic
```typescript
const result = await executeWorkflowTransition({
  submissionId: application.id,
  currentStatus: application.status,
  applicationType: "Investment" | "Loan",
  action: "return",
  userRole: currentUser.role,
  userId: currentUser.id,
  comment: returnComment
});
```

#### Access Control
- **Allowed Roles**: Gatekeepers of current stage + Sales Manager
- **Example**: 
  - Customer Validation → Can return to Submission
  - Credit Check → Can return to Customer Validation
  - Payment Verification → Can return to Credit Check

#### Operation Flow
1. User clicks "Return to Previous Node"
2. Modal opens with comment field
3. User enters correction instructions
4. Confirms return action
5. Status changes to "Returned"
6. Previous stage team is notified
7. Operation logged with comment

#### Status Mapping
```typescript
// From any stage → "Returned" status
// Application appears in previous stage's queue
nextStageOn.return = "previous_stage_id"
```

---

## 3. Approve and Continue

### Purpose
Advances application to the next workflow stage after successful review.

### Implementation

#### UI Components
- **Approve Button**: Dynamic label based on stage
  - "Approve & Continue" (general)
  - "Final Audit Pass" (Internal Audit)
  - "Confirm Payment Verification" (Payment stage)
  - "Issue Certificate" (Investment final stage)
  - "Confirm Disbursement" (Loan final stage)

#### Workflow Logic
```typescript
const result = await executeWorkflowTransition({
  submissionId: application.id,
  currentStatus: application.status,
  applicationType: "Investment" | "Loan",
  action: "approve",
  userRole: currentUser.role,
  userId: currentUser.id,
  comment: "Stage approved - Moving to next gate"
});
```

#### Stage Progression

**Investment Workflow:**
1. Submission → Customer Validation
2. Customer Validation → Payment Verification
3. Payment Verification → Issue Certificate
4. Issue Certificate → **APPROVED**

**Loan Workflow:**
1. Submission → Customer Validation
2. Customer Validation → Credit Check
3. Credit Check → Request For Payment
4. Request For Payment → Disbursed
5. Disbursed → **APPROVED**

#### Special Requirements

**Credit Check Stage (Loans Only):**
- Must set "Eligible Amount" before approval
- Amount validation required
- Separate input field provided
- Blocks approval until amount is set

```typescript
// Check if can proceed from Credit Check
if (!canProceedFromCreditCheck(eligibleAmount)) {
  return "Eligible Amount must be supplied";
}
```

#### Access Control
- **Allowed Roles**: Gatekeepers defined in workflow stage
- **Example Gatekeepers**:
  - Submission: Sales Manager, Super Admin
  - Customer Validation: Customer Experience, Super Admin
  - Credit Check: Credit, Super Admin
  - Payment: Finance, Internal Control, Super Admin

#### Operation Flow
1. User reviews application details
2. Verifies all requirements met
3. (Credit stage) Enters eligible amount if needed
4. Clicks approve button
5. Status advances to next stage
6. Next team notified
7. Operation logged
8. Application refreshes

---

## 4. Decline Application

### Purpose
Permanently rejects application with documented reason.

### Implementation

#### UI Components
- **Decline Button**: Opens action modal
- **Action Modal**:
  - Comment textarea (required)
  - Red warning colors
  - Confirm/Discard buttons

#### Workflow Logic
```typescript
const result = await executeWorkflowTransition({
  submissionId: application.id,
  currentStatus: application.status,
  applicationType: "Investment" | "Loan",
  action: "decline",
  userRole: currentUser.role,
  userId: currentUser.id,
  comment: declineReason
});
```

#### Access Control
- **Allowed Roles**: Gatekeepers of current stage
- **Final Action**: Cannot be undone
- **Status Change**: Sets to "Declined"

#### Operation Flow
1. User clicks "Decline Application"
2. Modal opens with red theme
3. User enters detailed rejection reason
4. Confirms decline action
5. Status changes to "Declined"
6. Applicant notified with reason
7. Operation logged
8. Application archived

#### Best Practices
- Provide clear, specific reasons
- Reference policy violations if applicable
- Be professional and respectful
- Include corrective actions if reapplication possible

---

## Available Actions by Role

### Super Admin
- ✅ Approve & Continue (all stages)
- ✅ Decline Application (all stages)
- ✅ Return to Previous Node (all stages)
- ✅ Reassign Owner
- ✅ Edit Details (Pending/Returned)

### Sales Manager
- ✅ Approve & Continue (Submission stage)
- ✅ Decline Application (Submission stage)
- ✅ Return to Previous Node (all stages)
- ✅ Reassign Owner
- ✅ Edit Details (Pending/Returned)

### Customer Experience
- ✅ Approve & Continue (Customer Validation)
- ✅ Decline Application (Customer Validation)
- ✅ Return to Previous Node (Customer Validation)

### Credit
- ✅ Approve & Continue (Credit Check)
- ✅ Set Eligible Amount (Credit Check)
- ✅ Decline Application (Credit Check)
- ✅ Return to Previous Node (Credit Check)

### Internal Control
- ✅ Approve & Continue (Payment Verification)
- ✅ Decline Application (Payment Verification)
- ✅ Return to Previous Node (Payment Verification)

### Finance
- ✅ Approve & Continue (Payment/Disbursement)
- ✅ Decline Application (Payment/Disbursement)
- ✅ Return to Previous Node (Payment/Disbursement)

### Sales Officer / Sales Team Lead
- ✅ Edit Details (Pending/Returned only)
- ❌ No approval rights

---

## UI Features

### Button States
- **Enabled**: Bright colors, clickable
- **Disabled**: Grayed out, opacity 50%
- **Loading**: Shows spinner during action

### Visual Indicators
- **Approve**: Indigo/Blue theme with checkmark
- **Decline**: Rose/Red theme with cancel icon
- **Return**: Amber/Orange theme with undo icon
- **Reassign**: Indigo theme with swap icon

### Action Confirmation
- **Reassign**: Modal with user selection
- **Return**: Modal with required comment
- **Decline**: Modal with required reason
- **Approve**: Direct action (except Credit Check)

### Operation History
All actions logged with:
- Timestamp
- Actor name and role
- Action type (uppercase)
- Comment/reason
- Visual timeline display

---

## Workflow State Machine

### Investment States
```
Pending Review → Docs Verification → Internal Audit → 
Pending Disbursement → Approved

                ↓
            Declined/Returned
```

### Loan States
```
Pending Review → Docs Verification → Internal Audit → 
Pending Disbursement → Approved

                ↓
            Declined/Returned
```

### State Transitions
```typescript
// Approve action
status = getNextStatus(currentStatus, applicationType, "approve");

// Decline action
status = "Declined"; // Terminal state

// Return action
status = "Returned"; // Goes to previous stage queue
```

---

## Technical Implementation

### Frontend Components
- **InvestmentView.tsx** - Investment workflow handlers
- **LoanView.tsx** - Loan workflow handlers
- **WorkflowStageIndicator.tsx** - Visual progress display
- **ApprovalGatesView.tsx** - Gate configuration display

### Backend Services
- **workflowService.ts** - Transition execution
  - `executeWorkflowTransition()` - Main transition handler
  - `reassignApplication()` - Ownership transfer
  - `updateEligibleAmount()` - Credit check amount
  - `getWorkflowContext()` - Permission checking

- **workflowManager.ts** - Workflow definitions
  - `LOAN_WORKFLOW` - 5-stage loan process
  - `INVESTMENT_WORKFLOW` - 4-stage investment process
  - `canPerformAction()` - Permission validation
  - `getNextStatus()` - State transition logic
  - `getAvailableActions()` - Button visibility

### Database Operations
```sql
-- Transition execution
UPDATE form_submissions
SET 
  status = 'new_status',
  reviewed_by = 'user_id',
  reviewed_at = NOW(),
  review_notes = 'comment'
WHERE id = 'submission_id';

-- Reassignment
UPDATE form_submissions
SET reviewed_by = 'new_owner_id'
WHERE id = 'submission_id';

-- Eligible amount update
UPDATE form_submissions
SET field_responses = jsonb_set(
  field_responses,
  '{eligible_amount}',
  '"amount_value"'
)
WHERE id = 'submission_id';
```

---

## User Fetching for Reassignment

### Implementation
```typescript
// Fetch all users except current user
const { data: availableUsers } = await supabase
  .from('users')
  .select('id, name, role')
  .neq('id', currentUser.id)
  .order('name');
```

### Display Format
```
John Doe (Sales Manager)
Jane Smith (Customer Experience)
Mike Johnson (Credit)
```

---

## Error Handling

### Permission Denied
```typescript
if (!canPerformAction(userRole, currentStatus, applicationType, action)) {
  return {
    success: false,
    error: `Your role (${userRole}) cannot perform ${action} at stage: ${currentStatus}`
  };
}
```

### Credit Check Validation
```typescript
if (applicationType === "Loan" && status === "Internal Audit") {
  if (!eligibleAmount || parseFloat(eligibleAmount) <= 0) {
    return {
      success: false,
      error: "Eligible Amount must be supplied before proceeding"
    };
  }
}
```

### Missing Comment
```typescript
if (!comment || !comment.trim()) {
  // Disable confirm button
  // Show error message
  return;
}
```

---

## Testing Checklist

### Reassignment
- ✅ Opens modal with user list
- ✅ Excludes current user
- ✅ Updates ownership on confirm
- ✅ Logs operation
- ✅ Shows success message
- ✅ Refreshes application list

### Return to Previous Node
- ✅ Opens modal with comment field
- ✅ Requires comment to proceed
- ✅ Changes status to "Returned"
- ✅ Logs operation with comment
- ✅ Application visible in previous queue

### Approve and Continue
- ✅ Shows correct button label per stage
- ✅ Advances to next stage
- ✅ Blocks if eligible amount missing (Credit)
- ✅ Logs approval action
- ✅ Notifies next team
- ✅ Updates application status

### Decline Application
- ✅ Opens modal with red theme
- ✅ Requires reason comment
- ✅ Sets status to "Declined"
- ✅ Logs rejection
- ✅ Shows declined badge
- ✅ Disables further actions

---

## Integration Points

### Audit Logging
All actions integrate with audit system:
```typescript
await logWorkflowTransition({
  submissionId,
  fromStatus,
  toStatus,
  action,
  userId,
  userRole,
  comment
});
```

### Notifications
Workflow transitions trigger notifications:
- Return → Previous stage team
- Approve → Next stage team
- Decline → Sales team + Applicant
- Reassign → New owner

### Real-time Updates
Uses Supabase subscriptions for live updates:
- Status changes
- Operation log additions
- Ownership transfers

---

## Security Considerations

### Role-Based Access Control
- All actions validate user role
- Super Admin override capability
- Gatekeeper restrictions enforced

### Audit Trail
- Every action logged
- User and timestamp recorded
- Comments preserved
- Cannot modify history

### Data Validation
- Comment requirements enforced
- Amount validation (Credit Check)
- Status transition validation
- Permission checks before execution

---

## Summary

The workflow action system provides a complete, secure, and user-friendly interface for managing application lifecycles. All four core actions are fully implemented with:

- ✅ Proper access control
- ✅ Comprehensive error handling
- ✅ Rich user interface
- ✅ Complete audit logging
- ✅ Real-time updates
- ✅ Professional documentation

Users can now efficiently process applications through each stage with clear actions, proper validations, and full traceability.
