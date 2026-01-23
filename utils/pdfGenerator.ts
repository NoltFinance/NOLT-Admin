import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FormSubmission, FormField } from "../types";

export const generateSubmissionPDF = (
    submission: FormSubmission,
    fields: FormField[],
    formName: string
) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(2, 143, 245); // Primary Color (Blue)
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("NOLT FINANCE", 20, 20);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Submission Report", 20, 30);

    // Submission Info
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(formName, 20, 55);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text(`Applicant: ${submission.applicant_name}`, 20, 65);
    doc.text(`Email: ${submission.applicant_email}`, 20, 70);
    doc.text(`Date: ${new Date(submission.submitted_at).toLocaleString()}`, 20, 75);
    doc.text(`Status: ${submission.status}`, 150, 65);
    doc.text(`Reference: #${submission.id.substring(0, 8)}`, 150, 70);

    // Prepare table data
    const tableData = fields.map((field) => {
        let value = submission.field_responses[field.id];

        // Format value based on type
        if (value === undefined || value === null) {
            value = "Not provided";
        } else if (field.field_type === "file") {
            value = "File attached (Click link in portal)"; // PDF links are tricky with auth, keeping simple
        } else if (field.field_type === "signature") {
            value = "Signed (See portal for image)";
        } else if (typeof value === "boolean") {
            value = value ? "Yes" : "No";
        } else if (Array.isArray(value)) {
            value = value.join(", ");
        } else if (typeof value === "object") {
            value = JSON.stringify(value);
        }

        return [field.label, value.toString()];
    });

    // Generate Table
    autoTable(doc, {
        startY: 85,
        head: [["Question", "Response"]],
        body: tableData,
        theme: "grid",
        headStyles: {
            fillColor: [2, 143, 245],
            textColor: [255, 255, 255],
            fontStyle: "bold",
        },
        styles: {
            fontSize: 10,
            cellPadding: 5,
        },
        columnStyles: {
            0: { cellWidth: 80, fontStyle: "bold" },
            1: { cellWidth: "auto" },
        },
    });

    // Footer
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" }
        );
    }

    // Save PDF
    doc.save(`${submission.applicant_name}_${formName}_Submission.pdf`);
};
