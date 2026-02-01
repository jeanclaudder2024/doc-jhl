import React, { useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useProposal, useUpdateProposal, useCreateProposal, useSignProposal } from '@/hooks/use-proposals';
import { AdminLayout } from '@/components/AdminLayout';
import { ProposalDocument } from '@/components/ProposalDocument';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ProposalResponse, UpdateProposalRequest } from "@shared/routes";

export default function AdminEditProposal() {
  const [match, params] = useRoute("/admin/proposals/:id");
  const isNew = params?.id === "new";
  const id = isNew ? 0 : Number(params?.id);
  
  const { data: proposal, isLoading } = useProposal(id);
  const { mutateAsync: createProposal, isPending: isCreating } = useCreateProposal();
  const { mutateAsync: updateProposal, isPending: isUpdating } = useUpdateProposal();
  const { mutateAsync: signProposal } = useSignProposal();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // If new, create a shell immediately so we can edit it using the same component
  // In a real app, might want a separate form for "New", but here we want WYSIWYG
  useEffect(() => {
    if (isNew) {
      // Create a draft proposal immediately then redirect to edit it
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
    // Debounce this in a real app, or save on blur
    // For now, we update on every change which triggers a mutation
    // To prevent thrashing, the hook optimistically updates UI, but let's be careful
    updateProposal({ id: proposal.id, ...updates }).catch(() => {});
  };

  const handleSign = (role: 'noviq' | 'licensee', signature: string) => {
    signProposal({ id: proposal.id, role, signature });
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {isUpdating && <span className="text-xs text-muted-foreground animate-pulse">Saving changes...</span>}
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
