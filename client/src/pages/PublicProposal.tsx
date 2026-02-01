import React from 'react';
import { useRoute } from 'wouter';
import { usePublicProposal, useSignProposal, useUpdateProposal } from '@/hooks/use-proposals';
import { ProposalDocument } from '@/components/ProposalDocument';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function PublicProposal() {
  const [match, params] = useRoute("/p/:id");
  const id = Number(params?.id);
  
  const { data: proposal, isLoading, error } = usePublicProposal(id);
  const { mutateAsync: signProposal } = useSignProposal();
  const { mutateAsync: updateProposal } = useUpdateProposal(); // Used for Payment Selection updates

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
        <p className="text-muted-foreground">This proposal may have been deleted or the link is invalid.</p>
      </div>
    );
  }

  const handleSign = (role: 'noviq' | 'licensee', signature: string) => {
    signProposal({ id: proposal.id, role, signature });
  };

  const handleUpdate = (updates: any) => {
    // Public user can only update payment terms/options
    if (updates.paymentOption || updates.paymentTerms) {
      updateProposal({ id: proposal.id, ...updates });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100/50 py-8 px-4 md:px-8">
      <ProposalDocument 
        proposal={proposal} 
        readOnly={false} 
        isPublic={true}
        onSign={handleSign}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
