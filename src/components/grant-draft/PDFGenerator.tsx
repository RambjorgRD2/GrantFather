import jsPDF from 'jspdf';

interface GrantSection {
  introduction: string;
  need_statement: string;
  project_plan: string;
  budget: string;
  outcomes: string;
  conclusion: string;
}

interface GrantApplication {
  project_name: string;
  funding_amount: number;
  timeline_start: string;
  timeline_end: string;
  organizations: {
    name: string;
    org_type: string;
  };
}

const sectionLabels = {
  introduction: "Introduction",
  need_statement: "Statement of Need",
  project_plan: "Project Plan",
  budget: "Budget",
  outcomes: "Expected Outcomes",
  conclusion: "Conclusion"
};

export function generateGrantPDF(sections: GrantSection, application: GrantApplication) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper function to add text with line wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12): number => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    
    for (let i = 0; i < lines.length; i++) {
      if (y + (i * lineHeight) > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
        i = 0; // Reset line counter for new page
      }
      doc.text(lines[i], x, y + (i * lineHeight));
    }
    
    return y + (lines.length * lineHeight);
  };

  // Add header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  yPosition = addWrappedText(application.project_name, margin, yPosition, pageWidth - 2 * margin, 20);
  
  yPosition += 10;
  
  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  yPosition = addWrappedText(`Grant Application by ${application.organizations.name}`, margin, yPosition, pageWidth - 2 * margin, 14);
  
  yPosition += 5;
  
  doc.setFontSize(12);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('no-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('no-NO');
  
  yPosition = addWrappedText(
    `Requested Amount: ${formatCurrency(application.funding_amount)} | Timeline: ${formatDate(application.timeline_start)} - ${formatDate(application.timeline_end)}`,
    margin,
    yPosition,
    pageWidth - 2 * margin
  );
  
  yPosition += 15;

  // Add sections
  Object.entries(sections).forEach(([key, content]) => {
    if (!content?.trim()) return;
    
    // Check if we need a new page for the section header
    if (yPosition > doc.internal.pageSize.getHeight() - margin - 30) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Section header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    yPosition = addWrappedText(sectionLabels[key as keyof typeof sectionLabels], margin, yPosition, pageWidth - 2 * margin, 16);
    
    yPosition += 5;
    
    // Section content
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    yPosition = addWrappedText(content.trim(), margin, yPosition, pageWidth - 2 * margin);
    
    yPosition += 15;
  });

  // Save the PDF
  doc.save(`${application.project_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_grant_application.pdf`);
}