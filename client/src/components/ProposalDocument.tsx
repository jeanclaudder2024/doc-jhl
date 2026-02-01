import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "./SignaturePad";
import { Printer, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposalResponse, UpdateProposalRequest } from "@shared/routes";

// Define the payment calculator logic separately for clarity
function calculatePayments(totalFee: number, option: string, terms: any) {
  let upfront = 0;
  let remaining = 0;
  let monthly = 0;
  let serviceFee = 0;
  let months = terms.installments || 1;

  // Base fee logic (if fee is applied)
  const baseFeeAmount = terms.feeOnFull ? (terms.baseFee || 0) : 0; 
  // NOTE: Simple fee logic for MVP based on description:
  // Usually fees are percentage based, but description says "base-fee".
  // Assuming simpler logic: if Custom + FeeOnFull, add baseFee to total.
  
  const grandTotal = totalFee + baseFeeAmount;

  if (option === 'milestone') {
    upfront = grandTotal * 0.30;
    remaining = grandTotal - upfront;
    monthly = 0; // Not applicable
  } else if (option === 'installment') {
    upfront = grandTotal * 0.50;
    remaining = grandTotal - upfront;
    monthly = remaining / 3; // Standard 3 months for installment per description context usually
    months = 3;
  } else if (option === 'custom') {
    const pct = Math.max(10, terms.upfrontPercent || 10) / 100;
    upfront = grandTotal * pct;
    remaining = grandTotal - upfront;
    months = Math.max(1, terms.installments || 1);
    monthly = remaining / months;
  }

  return { upfront, remaining, monthly, grandTotal, months };
}

interface ProposalDocumentProps {
  proposal: ProposalResponse;
  readOnly?: boolean; // For admin view where we just preview
  isPublic?: boolean; // For the actual public interaction
  onUpdate?: (updates: UpdateProposalRequest) => void;
  onSign?: (role: 'noviq' | 'licensee', signature: string) => void;
}

export function ProposalDocument({ 
  proposal, 
  readOnly = false, 
  isPublic = false,
  onUpdate,
  onSign
}: ProposalDocumentProps) {
  // Local state for interactive elements (even if synced with backend)
  const [paymentOption, setPaymentOption] = useState(proposal.paymentOption || 'milestone');
  const [paymentTerms, setPaymentTerms] = useState(proposal.paymentTerms || { upfrontPercent: 30 });
  const [totals, setTotals] = useState({ upfront: 0, remaining: 0, monthly: 0, grandTotal: 0, months: 0 });

  // Sync state when props change
  useEffect(() => {
    setPaymentOption(proposal.paymentOption);
    setPaymentTerms(proposal.paymentTerms || { upfrontPercent: 30 });
  }, [proposal]);

  // Recalculate whenever inputs change
  useEffect(() => {
    const totalDevFee = parseFloat(proposal.totalDevelopmentFee as string);
    const domainFee = parseFloat((proposal.domainPackageFee || "0") as string);
    const total = totalDevFee + domainFee;
    
    setTotals(calculatePayments(total, paymentOption, paymentTerms));
  }, [paymentOption, paymentTerms, proposal.totalDevelopmentFee, proposal.domainPackageFee]);

  const handlePaymentOptionChange = (val: string) => {
    if (readOnly) return;
    setPaymentOption(val as any);
    onUpdate?.({ paymentOption: val as any });
  };

  const handleTermChange = (key: string, value: any) => {
    if (readOnly) return;
    const newTerms = { ...paymentTerms, [key]: value };
    setPaymentTerms(newTerms);
    onUpdate?.({ paymentTerms: newTerms });
  };

  const currency = (num: number) => 
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(num);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Action Bar (No Print) */}
      <div className="no-print mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-border">
        <div>
          <h2 className="font-display font-semibold text-lg text-primary">Proposal Status: <span className="uppercase tracking-widest text-sm bg-primary/10 text-primary px-2 py-1 rounded ml-2">{proposal.status}</span></h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.share?.({ title: proposal.title, url: window.location.href }).catch(() => {});
          }}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Document Container */}
      <div className="bg-white paper-texture shadow-xl rounded-none md:rounded-xl min-h-[1123px] w-full p-8 md:p-16 text-foreground print:shadow-none print:p-0">
        
        {/* Header */}
        <header className="border-b-2 border-primary/10 pb-8 mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-primary mb-2 tracking-tight">
                Service Agreement
              </h1>
              <p className="text-muted-foreground font-serif text-lg italic">
                & Project Deliverables
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="w-12 h-12 bg-primary text-white flex items-center justify-center font-display font-bold text-2xl rounded-lg ml-auto mb-2">N</div>
              <p className="text-xs font-bold tracking-widest uppercase text-primary">NOVIQ Studio</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <p className="text-muted-foreground uppercase tracking-widest text-xs font-semibold mb-1">Licensor (Provider)</p>
              <p className="font-semibold text-lg">Noviq — Jean Claude Dergham</p>
              <p className="text-muted-foreground">hello@noviq.com</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-widest text-xs font-semibold mb-1">Licensee (Client)</p>
              {readOnly ? (
                <p className="font-semibold text-lg">{proposal.clientName}</p>
              ) : (
                <Input 
                  value={proposal.clientName} 
                  onChange={(e) => onUpdate?.({ clientName: e.target.value })}
                  className="text-lg font-semibold border-none shadow-none p-0 h-auto rounded-none border-b border-dashed border-primary/20 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/50"
                  placeholder="Enter Client Name"
                />
              )}
            </div>
          </div>
        </header>

        {/* 1. Scope */}
        <section className="mb-12">
          <h3 className="text-2xl font-display font-bold text-primary mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/5 text-primary text-sm flex items-center justify-center mr-3 font-sans font-bold">1</span>
            Comprehensive Project Scope
          </h3>
          <div className="space-y-4 pl-11">
            {proposal.items.map((item, idx) => (
              <div key={item.id} className="flex gap-4 items-start group">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-gray-900">{item.title}</h4>
                  {item.description && (
                    <p className="text-gray-600 leading-relaxed mt-1 text-sm">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
            {proposal.items.length === 0 && (
              <p className="text-muted-foreground italic">No scope items defined.</p>
            )}
          </div>
        </section>

        {/* 2. Financial Terms */}
        <section className="mb-12 break-inside-avoid">
          <h3 className="text-2xl font-display font-bold text-primary mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/5 text-primary text-sm flex items-center justify-center mr-3 font-sans font-bold">2</span>
            Financial Investment
          </h3>
          <div className="pl-11">
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-primary/5 text-primary font-semibold">
                  <tr>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-4">
                      <p className="font-medium">Total Development Fee</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Design, Development, and Deployment</p>
                    </td>
                    <td className="p-4 text-right font-mono font-medium">
                      {currency(parseFloat(proposal.totalDevelopmentFee as string))}
                    </td>
                  </tr>
                  {parseFloat(proposal.domainPackageFee as string) > 0 && (
                    <tr>
                      <td className="p-4">
                        <p className="font-medium">Domain & Setup Package</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Optional add-on</p>
                      </td>
                      <td className="p-4 text-right font-mono font-medium">
                        {currency(parseFloat(proposal.domainPackageFee as string))}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-primary/5 font-bold text-primary">
                    <td className="p-4 text-right uppercase text-xs tracking-widest pt-5">Total Investment</td>
                    <td className="p-4 text-right font-mono text-lg">
                      {currency(totals.grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 3. Payment Structure */}
        <section className="mb-12 break-inside-avoid">
          <h3 className="text-2xl font-display font-bold text-primary mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/5 text-primary text-sm flex items-center justify-center mr-3 font-sans font-bold">3</span>
            Payment Structure
          </h3>
          <div className="pl-11">
            
            {/* Interactive Selection (Hidden in Print) */}
            <div className="no-print mb-8">
              <RadioGroup 
                value={paymentOption} 
                onValueChange={handlePaymentOptionChange}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem value="milestone" id="milestone" className="peer sr-only" />
                  <Label
                    htmlFor="milestone"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all h-full"
                  >
                    <span className="text-lg font-bold mb-2">Milestone</span>
                    <span className="text-center text-xs text-muted-foreground leading-snug">
                      Standard option. <br/> 30% Upfront, 70% Completion.
                    </span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="installment" id="installment" className="peer sr-only" />
                  <Label
                    htmlFor="installment"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all h-full"
                  >
                    <span className="text-lg font-bold mb-2">Installment</span>
                    <span className="text-center text-xs text-muted-foreground leading-snug">
                      Flexible. <br/> 50% Upfront, split remainder over 3 months.
                    </span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
                  <Label
                    htmlFor="custom"
                    className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-transparent p-4 hover:bg-accent/5 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary cursor-pointer transition-all h-full"
                  >
                    <span className="text-lg font-bold mb-2">Custom</span>
                    <span className="text-center text-xs text-muted-foreground leading-snug">
                      Tailored plan. <br/> Define percentage and duration.
                    </span>
                  </Label>
                </div>
              </RadioGroup>

              {/* Custom Controls */}
              {paymentOption === 'custom' && (
                <div className="mt-6 p-6 bg-secondary/30 rounded-xl border border-border animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider text-muted-foreground">Custom Terms Configuration</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Upfront Percentage (%)</Label>
                      <Input 
                        type="number" 
                        min="10" 
                        max="100" 
                        value={paymentTerms.upfrontPercent || 30}
                        onChange={(e) => handleTermChange('upfrontPercent', parseFloat(e.target.value))}
                        disabled={readOnly}
                      />
                      <p className="text-xs text-muted-foreground">Minimum 10% required</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Installment Months</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="24" 
                        value={paymentTerms.installments || 1}
                        onChange={(e) => handleTermChange('installments', parseFloat(e.target.value))}
                        disabled={readOnly}
                      />
                    </div>
                    {/* <div className="flex items-center space-x-2 pt-8">
                      <Checkbox 
                        id="feeOnFull" 
                        checked={paymentTerms.feeOnFull || false}
                        onCheckedChange={(c) => handleTermChange('feeOnFull', c === true)}
                        disabled={readOnly}
                      />
                      <Label htmlFor="feeOnFull">Apply Service Fee?</Label>
                    </div> */}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Plan Summary (Visible in Print & Screen) */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
              <h4 className="font-display font-bold text-lg text-primary mb-4 border-b border-primary/10 pb-2">
                Selected Plan: <span className="capitalize">{paymentOption}</span>
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Upfront</p>
                  <p className="text-xl font-mono font-bold text-primary">{currency(totals.upfront)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Remaining</p>
                  <p className="text-xl font-mono text-gray-700">{currency(totals.remaining)}</p>
                </div>
                {totals.monthly > 0 && (
                   <div className="col-span-2 md:col-span-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Monthly Schedule</p>
                    <p className="text-xl font-mono text-gray-700">
                      {currency(totals.monthly)} <span className="text-sm text-muted-foreground font-sans font-normal">/ month for {totals.months} month{totals.months > 1 ? 's' : ''}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Recurring Support */}
        <section className="mb-12 break-inside-avoid">
          <h3 className="text-2xl font-display font-bold text-primary mb-6 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/5 text-primary text-sm flex items-center justify-center mr-3 font-sans font-bold">4</span>
            Recurring Support & Hosting
          </h3>
          <div className="pl-11">
            <div className="bg-gradient-to-br from-white to-secondary/30 border rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full -mr-12 -mt-12" />
              <div className="relative z-10">
                <p className="font-semibold text-lg text-primary mb-2">First Year Included</p>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  We provide comprehensive support, hosting maintenance, and security updates for the first 12 months at no additional cost. 
                  This ensures your platform remains secure, fast, and operational.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span>Annual Renewal Fee: €300 (Optional)</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <Separator className="my-12" />

        {/* Signatures */}
        <section className="break-inside-avoid">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Noviq Signature */}
            <div>
              <p className="text-xs uppercase tracking-widest font-bold mb-4 text-primary">Signed by Noviq (Licensor)</p>
              
              {/* Only Noviq (Admin) can sign here */}
              {!isPublic && !readOnly ? (
                 <SignaturePad 
                   label="Jean Claude Dergham"
                   initialData={proposal.noviqSignature}
                   onSave={(sig) => onSign?.('noviq', sig)}
                   onClear={() => {}} // Clear not implemented in this MVP hook
                   readOnly={false}
                 />
              ) : (
                <SignaturePad 
                  label="Jean Claude Dergham"
                  initialData={proposal.noviqSignature}
                  onSave={() => {}}
                  onClear={() => {}}
                  readOnly={true}
                />
              )}
              
              <div className="mt-2 text-xs text-muted-foreground font-mono">
                Date: {proposal.noviqSignDate ? format(new Date(proposal.noviqSignDate), 'PPP') : '__________________'}
              </div>
            </div>

            {/* Licensee Signature */}
            <div>
              <p className="text-xs uppercase tracking-widest font-bold mb-4 text-primary">Signed by {proposal.clientName || "Licensee"}</p>
              
              {/* Only Public User (Licensee) can sign here */}
              {isPublic && !readOnly ? (
                 <SignaturePad 
                   label={proposal.clientName || "Authorized Signature"}
                   initialData={proposal.licenseeSignature}
                   onSave={(sig) => onSign?.('licensee', sig)}
                   onClear={() => {}}
                   readOnly={!!proposal.licenseeSignature} // Lock if already signed
                 />
              ) : (
                <SignaturePad 
                  label={proposal.clientName || "Authorized Signature"}
                  initialData={proposal.licenseeSignature}
                  onSave={() => {}}
                  onClear={() => {}}
                  readOnly={true}
                />
              )}
               <div className="mt-2 text-xs text-muted-foreground font-mono">
                Date: {proposal.licenseeSignDate ? format(new Date(proposal.licenseeSignDate), 'PPP') : '__________________'}
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 pt-8 border-t border-border text-center text-xs text-muted-foreground no-print">
          <p>Noviq Studio • Service Agreement • Confidential</p>
        </footer>

      </div>
    </div>
  );
}
