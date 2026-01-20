import { getFormSubmissions, getForms } from "./formsService";
import { ReviewRequest, FormSubmission, CustomForm } from "../types";
import supabase from "../utils/supabase";

// Cache for user names to avoid repeated database calls
const userNameCache = new Map<string, string>();

/**
 * Fetch user name by ID with caching
 */
async function getUserName(userId: string | null): Promise<string> {
  if (!userId) return "Unassigned";

  // Check cache first
  if (userNameCache.has(userId)) {
    return userNameCache.get(userId)!;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.warn(`Could not fetch user name for ${userId}`);
      return "Unknown User";
    }

    // Cache the result
    userNameCache.set(userId, data.name);
    return data.name;
  } catch (err) {
    console.error("Error fetching user name:", err);
    return "Unknown User";
  }
}

/**
 * Convert form submissions to ReviewRequest format for legacy views
 */
async function convertSubmissionToReviewRequest(
  submission: FormSubmission,
  form: CustomForm,
): Promise<ReviewRequest> {
  const responses = submission.field_responses || {};

  // Extract common fields
  const amount =
    responses.amount ||
    responses.principal_amount ||
    responses.investment_amount ||
    "";
  const name =
    submission.applicant_name || responses.full_name || responses.name || "";
  const email = submission.applicant_email || responses.email || "";

  // Fetch the actual user name for reviewed_by
  const ownerName = await getUserName(submission.reviewed_by);

  // Build base request
  const baseRequest: ReviewRequest = {
    id: submission.id,
    referenceId: `#${form.type.slice(0, 3).toUpperCase()}-${submission.id.slice(0, 4)}`,
    type: form.type,
    amount: amount ? `₦${parseFloat(amount).toLocaleString()}` : "",
    dateSubmitted: new Date(submission.submitted_at).toLocaleDateString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
    ),
    status: mapSubmissionStatusToRequestStatus(submission.status),
    ownerId: submission.reviewed_by || "system",
    ownerName: ownerName,
    applicant: {
      name: name,
      email: email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      title: responses.title || "",
      isPep: responses.is_pep === "Yes" || responses.is_pep === true,
      gender: responses.gender || "",
      dateOfBirth: responses.date_of_birth || responses.dob || "",
      phone: responses.phone || responses.phone_number || "",
      bvn: responses.bvn || "",
      nin: responses.nin || "",
      stateOfOrigin: responses.state_of_origin || "",
      stateOfResidence: responses.state_of_residence || "",
      address: responses.home_address || responses.address || "",
      occupation: responses.occupation || "",
      mothersMaidenName: responses.mothers_maiden_name || "",
      religion: responses.religion || "",
      maritalStatus: responses.marital_status || "",
      countryCode: responses.country_code || "+234",
    },
  };

  // Add type-specific fields
  if (form.type === "Investment") {
    return {
      ...baseRequest,
      targetAmount: responses.target_amount
        ? `₦${parseFloat(responses.target_amount).toLocaleString()}`
        : "",
      selectedPlan: responses.investment_plan || responses.plan || "",
      tenure: responses.tenure || "",
      rolloverOption: responses.rollover_option || "",
      paymentStatus: responses.payment_status || "PENDING",
      transferReceiptUrl: responses.transfer_receipt || responses.payment_proof,
      governmentIdUrl: responses.government_id || responses.id_document,
      proofOfAddressUrl: responses.proof_of_address || responses.utility_bill,
    };
  } else if (form.type === "Loan") {
    return {
      ...baseRequest,
      loanCategory: responses.loan_category || responses.category || "",
      loanProduct: responses.loan_product || responses.product || "",
      repaymentPeriod: responses.repayment_period || "",
      hasActiveLoans:
        responses.has_active_loans === "Yes" ||
        responses.has_active_loans === true,
      monthlyIncome: responses.monthly_income
        ? `₦${parseFloat(responses.monthly_income).toLocaleString()}`
        : "",
      governmentIdUrl: responses.government_id || responses.id_document,
      bankStatementUrl: responses.bank_statement,
      proofOfAddressUrl: responses.proof_of_address || responses.utility_bill,
      selfieUrl: responses.selfie,
      applicant: {
        ...baseRequest.applicant,
        residentialStatus: responses.residential_status || "",
        dependents: responses.dependents
          ? parseInt(responses.dependents)
          : undefined,
      },
    };
  }

  return baseRequest;
}

/**
 * Map submission status to legacy RequestStatus
 */
function mapSubmissionStatusToRequestStatus(status: string): any {
  const statusMap: Record<string, string> = {
    Submitted: "Pending Review",
    "Under Review": "Docs Verification",
    Approved: "Approved",
    Rejected: "Declined",
  };
  return statusMap[status] || "Pending Review";
}

/**
 * Get all submissions as ReviewRequests
 */
export async function getAllSubmissionsAsRequests(): Promise<{
  data: ReviewRequest[];
  error: string | null;
}> {
  try {
    // Fetch all forms
    const { data: forms, error: formsError } = await getForms();
    if (formsError || !forms) {
      return { data: [], error: formsError || "Failed to fetch forms" };
    }

    // Fetch all submissions
    const { data: submissions, error: submissionsError } =
      await getFormSubmissions();
    if (submissionsError || !submissions) {
      return {
        data: [],
        error: submissionsError || "Failed to fetch submissions",
      };
    }

    // Create a map of forms by ID for quick lookup
    const formsMap = new Map(forms.map((form) => [form.id, form]));

    // Convert submissions to ReviewRequests (with await for async conversion)
    const requests: ReviewRequest[] = [];
    for (const submission of submissions) {
      const form = formsMap.get(submission.form_id);
      if (form) {
        const request = await convertSubmissionToReviewRequest(
          submission,
          form,
        );
        requests.push(request);
      }
    }

    return { data: requests, error: null };
  } catch (err) {
    console.error("Error getting submissions as requests:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch submissions",
    };
  }
}

/**
 * Get submissions filtered by form type (Investment or Loan)
 */
export async function getSubmissionsByType(
  type: "Investment" | "Loan",
): Promise<{
  data: ReviewRequest[];
  error: string | null;
}> {
  try {
    console.log(`[getSubmissionsByType] Fetching ${type} forms...`);

    // Fetch forms of the specified type
    const { data: forms, error: formsError } = await getForms({ type });

    console.log(`[getSubmissionsByType] Forms result:`, {
      formsCount: forms?.length || 0,
      error: formsError,
    });

    if (formsError || !forms) {
      console.error("[getSubmissionsByType] Error fetching forms:", formsError);
      return { data: [], error: formsError || "Failed to fetch forms" };
    }

    if (forms.length === 0) {
      console.warn(`[getSubmissionsByType] No ${type} forms found in database`);
      return { data: [], error: null };
    }

    // Get form IDs
    const formIds = forms.map((f) => f.id);
    console.log(
      `[getSubmissionsByType] Found ${formIds.length} ${type} forms:`,
      formIds,
    );

    // Fetch submissions for these forms
    const allSubmissions: ReviewRequest[] = [];

    for (const formId of formIds) {
      console.log(
        `[getSubmissionsByType] Fetching submissions for form ${formId}...`,
      );

      const { data: submissions, error: submissionsError } =
        await getFormSubmissions({ formId });

      if (submissionsError) {
        console.error(
          `[getSubmissionsByType] Error fetching submissions for form ${formId}:`,
          submissionsError,
        );
        continue;
      }

      console.log(
        `[getSubmissionsByType] Found ${submissions?.length || 0} submissions for form ${formId}`,
      );

      if (submissions) {
        const form = forms.find((f) => f.id === formId);
        if (form) {
          const convertedSubmissions = [];
          for (const sub of submissions) {
            const converted = await convertSubmissionToReviewRequest(sub, form);
            convertedSubmissions.push(converted);
          }
          allSubmissions.push(...convertedSubmissions);
        }
      }
    }

    console.log(
      `[getSubmissionsByType] Total ${type} submissions:`,
      allSubmissions.length,
    );
    return { data: allSubmissions, error: null };
  } catch (err) {
    console.error("[getSubmissionsByType] Unexpected error:", err);
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to fetch submissions",
    };
  }
}

/**
 * Get dashboard statistics from real submissions
 */
export async function getDashboardStats(): Promise<{
  investmentStats: { count: number; totalAmount: number };
  loanStats: { count: number; totalAmount: number };
  pendingCount: number;
  error: string | null;
}> {
  try {
    const { data: requests, error } = await getAllSubmissionsAsRequests();

    if (error) {
      return {
        investmentStats: { count: 0, totalAmount: 0 },
        loanStats: { count: 0, totalAmount: 0 },
        pendingCount: 0,
        error,
      };
    }

    // Calculate investment stats
    const investments = requests.filter((r) => r.type === "Investment");
    const investmentAmount = investments.reduce((sum, inv) => {
      const amount = inv.amount?.replace(/[₦,]/g, "") || "0";
      return sum + parseFloat(amount);
    }, 0);

    // Calculate loan stats
    const loans = requests.filter((r) => r.type === "Loan");
    const loanAmount = loans.reduce((sum, loan) => {
      const amount = loan.amount?.replace(/[₦,]/g, "") || "0";
      return sum + parseFloat(amount);
    }, 0);

    // Count pending applications
    const pendingStatuses = [
      "Pending Review",
      "Docs Verification",
      "Internal Audit",
    ];
    const pendingCount = requests.filter((r) =>
      pendingStatuses.includes(r.status),
    ).length;

    return {
      investmentStats: {
        count: investments.length,
        totalAmount: investmentAmount,
      },
      loanStats: { count: loans.length, totalAmount: loanAmount },
      pendingCount,
      error: null,
    };
  } catch (err) {
    console.error("Error getting dashboard stats:", err);
    return {
      investmentStats: { count: 0, totalAmount: 0 },
      loanStats: { count: 0, totalAmount: 0 },
      pendingCount: 0,
      error: err instanceof Error ? err.message : "Failed to fetch stats",
    };
  }
}
