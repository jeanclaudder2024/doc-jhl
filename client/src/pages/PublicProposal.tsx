import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { usePublicProposal, useSignProposal, usePublicUpdateProposal } from '@/hooks/use-proposals';
import { ProposalDocument } from '@/components/ProposalDocument';
import { Loader2, AlertCircle, Save, Lock, CheckCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PublicProposal() {
  const [match, params] = useRoute("/p/:id");
  const id = Number(params?.id);
  const { toast } = useToast();

  const { data: proposal, isLoading, error, refetch } = usePublicProposal(id);
  const { mutateAsync: signProposal, isPending: isSigning } = useSignProposal();
  const { mutateAsync: publicUpdateProposal, isPending: isUpdating } = usePublicUpdateProposal();

  // Local state for unsaved changes
  const [localChanges, setLocalChanges] = useState<{
    paymentOption?: string;
    paymentTerms?: any;
    domainPackageFee?: string | number;
  }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Check if proposal is locked (already signed by licensee)
  const isLocked = !!proposal?.licenseeSignature;

  // Reset local changes when proposal data changes
  useEffect(() => {
    if (proposal) {
      setLocalChanges({});
      setHasUnsavedChanges(false);
    }
  }, [proposal?.id]);

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

  // Handle signing - locks the proposal after
  const handleSign = async (role: 'noviq' | 'licensee', signature: string) => {
    try {
      // First save any pending changes
      if (hasUnsavedChanges && Object.keys(localChanges).length > 0) {
        await publicUpdateProposal({
          id: proposal.id,
          ...localChanges
        });
      }
      // Then sign
      await signProposal({ id: proposal.id, role, signature });
      toast({
        title: "Thank you!",
        description: "Proposal signed and locked. No further changes allowed."
      });
      refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to sign proposal",
        variant: "destructive"
      });
    }
  };

  // Track local changes without saving (no auto-save!)
  const handleLocalUpdate = (updates: any) => {
    if (isLocked) return; // Cannot update if locked

    setLocalChanges(prev => ({
      ...prev,
      ...updates
    }));
    setHasUnsavedChanges(true);
    setIsSaved(false);
  };

  // Save button handler
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || Object.keys(localChanges).length === 0) return;

    try {
      await publicUpdateProposal({
        id: proposal.id,
        ...localChanges
      });
      setHasUnsavedChanges(false);
      setLocalChanges({});
      setIsSaved(true);
      refetch();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive"
      });
    }
  };

  // Merge proposal data with local changes for display
  const displayProposal = {
    ...proposal,
    ...(hasUnsavedChanges ? {
      paymentOption: localChanges.paymentOption ?? proposal.paymentOption,
      paymentTerms: localChanges.paymentTerms ?? proposal.paymentTerms,
      domainPackageFee: localChanges.domainPackageFee ?? proposal.domainPackageFee,
    } : {})
  };

  return (
    <div className="min-h-screen bg-gray-100/50 py-8 px-4 md:px-8">
      {/* Save/Status Bar (only show when not locked) */}
      {!isLocked && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm text-amber-600 font-medium">You have unsaved changes</span>
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Changes saved</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  <span className="text-sm text-muted-foreground">Review and customize your options</span>
                </>
              )}
            </div>
            <Button
              onClick={handleSaveChanges}
              disabled={!hasUnsavedChanges || isUpdating}
              className="gap-2"
            >
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* Locked Notice */}
      {isLocked && (
        <div className="max-w-4xl mx-auto mb-4">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-primary">Proposal Signed & Locked</p>
              <p className="text-sm text-muted-foreground">This proposal has been signed and cannot be modified.</p>
            </div>
          </div>
        </div>
      )}

      <ProposalDocument
        proposal={displayProposal}
        readOnly={isLocked}
        isPublic={true}
        onSign={handleSign}
        onUpdate={handleLocalUpdate}
      />
    </div>
  );
}
