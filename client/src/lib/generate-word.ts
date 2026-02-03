import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Header, Footer, ImageRun, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import type { ProposalResponse } from "@shared/schema";

// Helper to convert base64 data URI to Uint8Array
function dataURItoUint8Array(dataURI: string): Uint8Array {
    try {
        const byteString = atob(dataURI.split(',')[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const int8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
            int8Array[i] = byteString.charCodeAt(i);
        }
        return int8Array;
    } catch (e) {
        console.error("Error converting data URI", e);
        return new Uint8Array();
    }
}

export async function generateProposalWord(
    proposal: ProposalResponse,
    totals: any,
    paymentOption: string,
    paymentTerms: any,
    includeDomainPackage: boolean
) {
    const currency = (num: number) =>
        new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(num);

    // Styles
    const heading1Style = {
        font: "Calibri",
        size: 48, // 24pt
        bold: true,
        color: "0f172a", // primary color
    };

    const heading2Style = {
        font: "Calibri",
        size: 32, // 16pt
        bold: true,
        color: "0f172a",
        spaceBefore: 400,
        spaceAfter: 200,
    };

    const normalStyle = {
        font: "Calibri",
        size: 22, // 11pt
    };

    const smallStyle = {
        font: "Calibri",
        size: 18, // 9pt
        color: "64748b",
    };

    // --- CONTENT GENERATION ---

    // 1. Header Section
    const headerSection = [
        new Paragraph({
            children: [
                new TextRun({ text: "Service Agreement", ...heading1Style }),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "& Project Deliverables", italics: true, size: 28, color: "64748b" }),
            ],
            spacing: { after: 400 },
        }),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.SINGLE, color: "cbd5e1" },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE },
                insideHorizontal: { style: BorderStyle.NONE },
            },
            rows: [
                new TableRow({
                    children: [
                        // Licensor
                        new TableCell({
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "LICENSOR (PROVIDER)", size: 16, bold: true, color: "64748b" })] }),
                                new Paragraph({ children: [new TextRun({ text: "Noviq — Jean Claude Dergham", bold: true, size: 24 })] }),
                                new Paragraph({ children: [new TextRun({ text: "hello@noviq.com", color: "64748b" })], spacing: { after: 200 } }),
                            ],
                        }),
                        // Licensee
                        new TableCell({
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "LICENSEE (CLIENT)", size: 16, bold: true, color: "64748b" })] }),
                                new Paragraph({ children: [new TextRun({ text: proposal.clientName || "_________________", bold: true, size: 24 })] }),
                                new Paragraph({ children: [new TextRun({ text: " ", color: "64748b" })], spacing: { after: 200 } }),
                            ],
                        }),
                    ],
                }),
            ],
        }),
    ];

    // 2. Scope
    const scopeItems = proposal.items.map(item => {
        const runs = [new TextRun({ text: "• " + item.title, bold: true, size: 22 })];
        const paras = [
            new Paragraph({
                children: runs,
                spacing: { before: 100 },
            })
        ];

        if (item.description) {
            paras.push(
                new Paragraph({
                    children: [new TextRun({ text: item.description, size: 20, color: "334155" })],
                    indent: { left: 300 },
                    spacing: { after: 100 },
                })
            );
        }
        return paras;
    }).flat();

    const scopeSection = [
        new Paragraph({ children: [new TextRun({ text: "1. Comprehensive Project Scope", ...heading2Style })] }),
        ...scopeItems,
        ...(proposal.items.length === 0 ? [new Paragraph({ children: [new TextRun({ text: "No scope items defined.", italics: true })] })] : []),
    ];

    // 3. Financial Terms
    const financialRows = [
        // Header
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })], shading: { fill: "f1f5f9" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Amount", bold: true })], alignment: AlignmentType.RIGHT })], shading: { fill: "f1f5f9" } }),
            ],
        }),
        // Dev Fee
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total Development Fee\nDesign, Development, and Deployment" })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: currency(parseFloat(proposal.totalDevelopmentFee as string)) })], alignment: AlignmentType.RIGHT })] }),
            ],
        }),
    ];

    if (totals.domainPackageAmount > 0) {
        financialRows.push(
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "All Domain Types Package\nComplete domain coverage" })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: currency(totals.domainPackageAmount) })], alignment: AlignmentType.RIGHT })] }),
                ],
            })
        );
    }

    if (totals.extraFee > 0) {
        financialRows.push(
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Extended Payment Fee\n7% per additional month (${totals.months - 1} extra months)` })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: currency(totals.extraFee) })], alignment: AlignmentType.RIGHT })] }),
                ],
            })
        );
    }

    // Total
    financialRows.push(
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TOTAL INVESTMENT", bold: true })], alignment: AlignmentType.RIGHT })], shading: { fill: "f1f5f9" } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: currency(totals.grandTotal), bold: true, size: 24 })], alignment: AlignmentType.RIGHT })], shading: { fill: "f1f5f9" } }),
            ],
        })
    );

    const financialsSection = [
        new Paragraph({ children: [new TextRun({ text: "2. Financial Investment", ...heading2Style })] }),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: financialRows,
        }),
    ];

    // 4. Payment Structure
    const paymentSection = [
        new Paragraph({ children: [new TextRun({ text: "3. Payment Structure", ...heading2Style })] }),
        new Paragraph({
            children: [
                new TextRun({ text: `Selected Plan: ${paymentOption.charAt(0).toUpperCase() + paymentOption.slice(1)}`, bold: true, size: 24 }),
            ],
            spacing: { after: 200 },
        }),
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Upfront Payment", bold: true })] }), new Paragraph({ children: [new TextRun({ text: currency(totals.upfront) })] })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Remaining Balance", bold: true })] }), new Paragraph({ children: [new TextRun({ text: currency(totals.remaining) })] })] }),
                    ],
                }),
            ],
        }),
    ];

    if (totals.monthly > 0) {
        paymentSection.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `Monthly Schedule: ${currency(totals.monthly)} / month for ${totals.months} months`, bold: true }),
                ],
                spacing: { before: 200 },
            })
        );
    }

    // 5. Recurring
    const recurringSection = [
        new Paragraph({ children: [new TextRun({ text: "4. Recurring Support & Hosting", ...heading2Style })] }),
        new Paragraph({
            children: [
                new TextRun({ text: "First Year Included", bold: true }),
            ],
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "We provide comprehensive support, hosting maintenance, and security updates for the first 12 months at no additional cost." }),
            ],
            spacing: { after: 100 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "Annual Renewal Fee: €300 (Optional)", bold: true }),
            ],
        }),
    ];

    // 6. Signatures
    // Prepare signature images
    const createSignatureRun = (sigData: string | null) => {
        if (!sigData) return new TextRun({ text: "__________________________" });
        try {
            const imageBuffer = dataURItoUint8Array(sigData);
            if (imageBuffer.length === 0) return new TextRun({ text: "__________________________ (Invalid Sig)" });
            return new ImageRun({
                data: imageBuffer,
                transformation: { width: 150, height: 60 },
            } as any);
        } catch {
            return new TextRun({ text: "__________________________ (Error)" });
        }
    };

    const signaturesSection = [
        new Paragraph({ text: "", spacing: { before: 400 } }), // Spacer
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }, // No internal column borders
                insideHorizontal: { style: BorderStyle.NONE },
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "Signed by Noviq (Licensor)", bold: true, size: 16, color: "64748b" })] }),
                                new Paragraph({ children: [createSignatureRun(proposal.noviqSignature)] }),
                                new Paragraph({ children: [new TextRun({ text: `Date: ${proposal.noviqSignDate ? new Date(proposal.noviqSignDate).toDateString() : '________'}`, ...smallStyle })] }),
                            ],
                        }),
                        new TableCell({
                            children: [
                                new Paragraph({ children: [new TextRun({ text: `Signed by ${proposal.clientName || 'Client'}`, bold: true, size: 16, color: "64748b" })] }),
                                new Paragraph({ children: [createSignatureRun(proposal.licenseeSignature)] }),
                                new Paragraph({ children: [new TextRun({ text: `Date: ${proposal.licenseeSignDate ? new Date(proposal.licenseeSignDate).toDateString() : '________'}`, ...smallStyle })] }),
                            ],
                        }),
                    ],
                }),
            ],
        }),
    ];


    // 7. INVOICE (New Page)
    const invoiceSection = [
        new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: "INVOICE", ...heading1Style })] }),
        new Paragraph({ children: [new TextRun({ text: `Invoice #${proposal.id.toString().padStart(4, '0')}`, color: "64748b" })] }),
        new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toDateString()}`, color: "64748b" })], spacing: { after: 400 } }),

        new Paragraph({ children: [new TextRun({ text: "Bill To:", bold: true, size: 18, color: "64748b" })] }),
        new Paragraph({ children: [new TextRun({ text: proposal.clientName || "Client", bold: true, size: 24 })], spacing: { after: 400 } }),

        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: financialRows, // Reuse financial rows
        }),

        new Paragraph({ children: [new TextRun({ text: "Payment Schedule: " + paymentOption, bold: true })], spacing: { before: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `Upfront: ${currency(totals.upfront)}` })] }),
        new Paragraph({ children: [new TextRun({ text: `Remaining: ${currency(totals.remaining)}` })] }),
    ];


    // --- ASSEMBLY ---
    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    ...headerSection,
                    ...scopeSection,
                    ...financialsSection,
                    ...paymentSection,
                    ...recurringSection,
                    ...signaturesSection,
                    ...invoiceSection
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Proposal_${proposal.clientName?.replace(/\s+/g, '_') || 'Draft'}.docx`);
}
