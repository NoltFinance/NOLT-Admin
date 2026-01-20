# Quick Reference: NOLT Finance Workflow System

## For Developers: How to Use the Workflow System

### 1. Getting Available Actions
```typescript
import { getAvailableActions } from '../utils/workflowManager';

// In your component
const availableActions = getAvailableActions(
  currentUser.role,
  application.status,
  "Loan" // or "Investment"
);

// availableActions = ["approve", "decline", "return", "edit", "reassign"]
```

### 2. Executing a Workflow Transition
```typescript
import { executeWorkflowTransition } from '../services/workflowService';

const result = await executeWorkflowTransition({
  submissionId: application.id,
  currentStatus: application.status,
  applicationType: "Loan", // or "Investment"
  action: "approve", // or "decline", "return"
  userRole: currentUser.role,
  userId: currentUser.id,
  comment: "Approval reason or comments"
});

if (result.success) {
  // Update UI with result.newStatus
  console.log("New status:", result.newStatus);
  console.log("Message:", result.message);
} else {
  alert(result.error);
}
```

### 3. Special: Credit Check with Eligible Amount
```typescript
import { updateEligibleAmount } from '../services/workflowService';
import { canProceedFromCreditCheck } from '../utils/workflowManager';

// Check if eligible amount is required
const canProceed = canProceedFromCreditCheck(eligibleAmount);

if (!canProceed) {
  alert("Please enter eligible amount");
  return;
}

// Update amount first
const amountResult = await updateEligibleAmount(
  loanId,
  "₦500,000",
  currentUser.id
);

// Then transition
const result = await executeWorkflowTransition({
  submissionId: loanId,
  currentStatus: "Internal Audit",
  applicationType: "Loan",
  action: "approve",
  userRole: "Credit",
  userId: currentUser.id,
  eligibleAmount: "₦500,000",
  comment: "Credit check complete"
});
```

### 4. Displaying Workflow Progress
```typescript
import WorkflowStageIndicator from './WorkflowStageIndicator';

<WorkflowStageIndicator 
  currentStatus={application.status}
  workflowType="Loan" // or "Investment"
  userRole={currentUser.role}
/>
```

### 5. Checking Permissions
```typescript
import { canPerformAction, canViewApplication } from '../utils/workflowManager';

// Check if user can perform specific action
const canApprove = canPerformAction(
  currentUser.role,
  application.status,
  "Loan",
  "approve"
);

// Check if user can view application
const canView = canViewApplication(
  currentUser.role,
  "Loan",
  application.assignedTo
);
```

## Workflow Stages Quick Reference

### Loan Workflow (5 Stages)
```
1. Submission (Pending Review) → Sales Manager
2. Customer Validation (Docs Verification) → Customer Experience
3. Credit Check (Internal Audit) → Credit + Eligible Amount
4. Request For Payment (Pending Disbursement) → Finance
5. Disbursed (Approved) → Complete
```

### Investment Workflow (4 Stages)
```
1. Submission (Pending Review) → Sales Manager
2. Customer Validation (Docs Verification) → Customer Experience
3. Payment Verification (Internal Audit) → Internal Control
4. Certificate Issued (Approved) → Complete
```

## Common Patterns

### Pattern 1: Show/Hide Action Buttons
```typescript
const availableActions = getAvailableActions(userRole, status, type);

{availableActions.includes("approve") && (
  <button onClick={handleApprove}>Approve</button>
)}

{availableActions.includes("decline") && (
  <button onClick={handleDecline}>Decline</button>
)}

{availableActions.includes("return") && (
  <button onClick={handleReturn}>Return</button>
)}
```

### Pattern 2: Generic Approve Handler
```typescript
const handleApprove = async () => {
  const result = await executeWorkflowTransition({
    submissionId: app.id,
    currentStatus: app.status,
    applicationType: app.type,
    action: "approve",
    userRole: currentUser.role,
    userId: currentUser.id,
    comment: `Approved by ${currentUser.role}`
  });

  if (result.success) {
    // Refetch data
    await refetchData();
  } else {
    alert(result.error);
  }
};
```

### Pattern 3: Stage-Specific Logic
```typescript
if (currentStage.name === "Credit Check") {
  // Show eligible amount input for Credit team
  return (
    <div>
      <input value={eligibleAmount} onChange={...} />
      <button 
        onClick={handleCreditApprove}
        disabled={!canProceedFromCreditCheck(eligibleAmount)}
      >
        Verify & Approve
      </button>
    </div>
  );
}
```

## Role Permissions Matrix

| Role | View Loans | View Investments | Gate 1 | Gate 2 | Credit | Gate 3 | Finance |
|------|-----------|-----------------|--------|--------|--------|--------|---------|
| Super Admin | ✅ Global | ✅ Global | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sales Manager | ✅ Global | ✅ Global | ✅ | ❌ | ❌ | ❌ | ❌ |
| Sales Officer | ✅ Own | ✅ Own | ❌ | ❌ | ❌ | ❌ | ❌ |
| Customer Experience | ✅ Global | ✅ Global | ❌ | ✅ | ❌ | ❌ | ❌ |
| Credit | ✅ Global | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Internal Control | ✅ Global | ✅ Global | ❌ | ❌ | ❌ | ✅ | ❌ |
| Finance | ✅ Global | ✅ Global | ❌ | ❌ | ❌ | ❌ | ✅ |

## Status Codes

```typescript
type RequestStatus = 
  | "Pending Review"      // Submission stage
  | "Docs Verification"   // Customer Validation stage
  | "Internal Audit"      // Credit Check (Loan) or Payment Verification (Investment)
  | "Pending Disbursement" // Request For Payment (Loan only)
  | "Approved"            // Final approved state
  | "Declined"            // Rejected
  | "Returned";           // Sent back for corrections
```

## Debugging Tips

### Check Available Actions
```typescript
console.log("Available actions:", getAvailableActions(role, status, type));
```

### Check Workflow Stage
```typescript
import { getCurrentStage } from '../utils/workflowManager';
const stage = getCurrentStage(status, type);
console.log("Current stage:", stage);
console.log("Gatekeepers:", stage.gatekeepers);
console.log("Possible actions:", stage.possibleActions);
```

### Check Permission
```typescript
console.log("Can approve?", canPerformAction(role, status, type, "approve"));
console.log("Can decline?", canPerformAction(role, status, type, "decline"));
console.log("Can return?", canPerformAction(role, status, type, "return"));
```

### Test Transition Without Executing
```typescript
import { getNextStatus } from '../utils/workflowManager';
const nextStatus = getNextStatus(currentStatus, type, "approve");
console.log("Next status if approved:", nextStatus);
```

## Error Handling

```typescript
try {
  const result = await executeWorkflowTransition({...});
  
  if (!result.success) {
    // Validation failed
    console.error("Validation error:", result.error);
    alert(result.error);
    return;
  }
  
  // Success
  console.log("Transition successful:", result.message);
  
} catch (error) {
  // Network or system error
  console.error("System error:", error);
  alert("System error. Please try again.");
}
```

## Testing

```typescript
// Example test for workflow transition
describe('Workflow Transition', () => {
  it('should allow Sales Manager to approve at Gate 1', async () => {
    const result = await executeWorkflowTransition({
      submissionId: 'test-id',
      currentStatus: 'Pending Review',
      applicationType: 'Loan',
      action: 'approve',
      userRole: 'Sales Manager',
      userId: 'user-1',
      comment: 'Test approval'
    });
    
    expect(result.success).toBe(true);
    expect(result.newStatus).toBe('Docs Verification');
  });
  
  it('should prevent Sales Officer from approving', async () => {
    const result = await executeWorkflowTransition({
      submissionId: 'test-id',
      currentStatus: 'Pending Review',
      applicationType: 'Loan',
      action: 'approve',
      userRole: 'Sales Officer',
      userId: 'user-2',
      comment: 'Test'
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot perform');
  });
});
```

## Need Help?

- **Workflow Logic:** See `/utils/workflowManager.ts`
- **Database Operations:** See `/services/workflowService.ts`
- **UI Component:** See `/components/WorkflowStageIndicator.tsx`
- **Full Guide:** See `/WORKFLOW-INTEGRATION-COMPLETE.md`
