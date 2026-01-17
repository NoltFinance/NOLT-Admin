
import { ReviewRequest } from '../types';

/**
 * Converts an array of objects to a CSV string.
 * Automatically handles flattening nested objects.
 */
export const downloadAsCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;

  // Get all unique keys from all objects (since some might have optional fields)
  const headers = Array.from(
    new Set(data.flatMap(obj => Object.keys(obj)))
  );

  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        const value = row[fieldName] ?? '';
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue}"`
          : stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Flattens an Investment request into a single-level object for CSV export.
 */
export const flattenInvestment = (req: ReviewRequest) => {
  return {
    'Reference ID': req.referenceId,
    'Status': req.status,
    'Plan': req.selectedPlan,
    'Amount': req.amount,
    'Target Amount': req.targetAmount,
    'Tenure': req.tenure,
    'Rollover Option': req.rolloverOption,
    'Date Submitted': req.dateSubmitted,
    'Payment Status': req.paymentStatus,
    'Title': req.applicant.title,
    'Full Name': req.applicant.name,
    'Email': req.applicant.email,
    'Is PEP': req.applicant.isPep ? 'Yes' : 'No',
    'Gender': req.applicant.gender,
    'DOB': req.applicant.dateOfBirth,
    'Mother Maiden Name': req.applicant.mothersMaidenName,
    'Religion': req.applicant.religion,
    'Marital Status': req.applicant.maritalStatus,
    'Phone': `${req.applicant.countryCode || ''} ${req.applicant.phone || ''}`,
    'BVN': req.applicant.bvn,
    'NIN': req.applicant.nin,
    'State of Origin': req.applicant.stateOfOrigin,
    'State of Residence': req.applicant.stateOfResidence,
    'Home Address': req.applicant.address,
    'NOK Name': req.applicant.nokName,
    'NOK Relationship': req.applicant.nokRelationship,
    'NOK Address': req.applicant.nokAddress,
  };
};

/**
 * Flattens a Loan request into a single-level object for CSV export.
 */
export const flattenLoan = (req: ReviewRequest) => {
  const flattened: any = {
    'Reference ID': req.referenceId,
    'Status': req.status,
    'Category': req.loanCategory,
    'Product': req.loanProduct,
    'Amount': req.amount,
    'Repayment Period': req.repaymentPeriod,
    'Monthly Income': req.monthlyIncome,
    'Has Active Loans': req.hasActiveLoans ? 'Yes' : 'No',
    'Date Submitted': req.dateSubmitted,
    'Eligible Amount': req.eligibleAmount,
    'Title': req.applicant.title,
    'Full Name': req.applicant.name,
    'Email': req.applicant.email,
    'Is PEP': req.applicant.isPep ? 'Yes' : 'No',
    'Gender': req.applicant.gender,
    'DOB': req.applicant.dateOfBirth,
    'Mother Maiden Name': req.applicant.mothersMaidenName,
    'Religion': req.applicant.religion,
    'Marital Status': req.applicant.maritalStatus,
    'Phone': `${req.applicant.countryCode || ''} ${req.applicant.phone || ''}`,
    'BVN': req.applicant.bvn,
    'NIN': req.applicant.nin,
    'State of Origin': req.applicant.stateOfOrigin,
    'State of Residence': req.applicant.stateOfResidence,
    'Home Address': req.applicant.address,
    'Residential Status': req.applicant.residentialStatus,
    'Dependents': req.applicant.dependents,
    'IPPIS Number': req.applicant.ippisNumber,
    'MDA': req.applicant.mda,
  };

  // Add references
  if (req.references) {
    req.references.forEach((ref, idx) => {
      flattened[`Ref ${idx + 1} Name`] = ref.name;
      flattened[`Ref ${idx + 1} Phone`] = ref.phone;
      flattened[`Ref ${idx + 1} Relation`] = ref.relationship;
    });
  }

  return flattened;
};
