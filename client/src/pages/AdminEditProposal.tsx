import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useProposal, useUpdateProposal, useCreateProposal, useSignProposal } from '@/hooks/use-proposals';
import { AdminLayout } from '@/components/AdminLayout';
import { ProposalDocument } from '@/components/ProposalDocument';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ProposalResponse, UpdateProposalRequest } from "@shared/routes";

export default function AdminEditProposal() {
  const [match, params] = useRoute("/admin/proposals/:id");
  const isNew = params?.id === "new";
  const id = isNew ? 0 : Number(params?.id);

  const { data: proposal, isLoading, refetch } = useProposal(id);
  const { mutateAsync: createProposal, isPending: isCreating } = useCreateProposal();
  const { mutateAsync: updateProposal, isPending: isUpdating } = useUpdateProposal();
  const { mutateAsync: signProposal } = useSignProposal();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // If new, create a shell immediately so we can edit it using the same component
  useEffect(() => {
    if (isNew) {
      createProposal({
        clientName: "New Client",
        totalDevelopmentFee: 900,
        paymentTerms: { upfrontPercent: 30, installments: 1, feeOnFull: false },
        title: "Service Agreement & Project Deliverables",
        items: []
      }).then((newProp) => {
        setLocation(`/admin/proposals/${newProp.id}`, { replace: true });
      });
    }
  }, [isNew, createProposal, setLocation]);

  if (isNew || isLoading || !proposal) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Loading workspace...</p>
        </div>
      </AdminLayout>
    );
  }

  const handleUpdate = (updates: UpdateProposalRequest) => {
    updateProposal({ id: proposal.id, ...updates }).catch(() => { });
  };

  const handleSign = (role: 'noviq' | 'licensee', signature: string) => {
    signProposal({ id: proposal.id, role, signature });
  };

  // Clear all signatures and reset to draft
  const handleResetProposal = async () => {
    try {
      await updateProposal({
        id: proposal.id,
        status: 'draft',
        noviqSignature: null,
        noviqSignDate: null,
        licenseeSignature: null,
        licenseeSignDate: null,
      } as any);
      setShowResetConfirm(false);
      refetch();
      toast({ title: "Reset", description: "Proposal reset to draft. All signatures cleared." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to reset proposal", variant: "destructive" });
    }
  };

  const hasSomeSignature = proposal.noviqSignature || proposal.licenseeSignature;

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {isUpdating && <span className="text-xs text-muted-foreground animate-pulse">Saving changes...</span>}

          {/* Reset button - only show if there's a signature */}
          {hasSomeSignature && !showResetConfirm && (
            <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Draft
            </Button>
          )}

          {/* Confirmation area */}
          {showResetConfirm && (
            <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm text-destructive">Clear all signatures?</span>
              <Button variant="destructive" size="sm" onClick={handleResetProposal}>
                Yes, Reset
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <ProposalDocument
        proposal={proposal}
        readOnly={false}
        isPublic={false}
        onUpdate={handleUpdate}
        onSign={handleSign}
      />
    </AdminLayout>
  );
}
