import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateProposalRequest, type UpdateProposalRequest, type ProposalResponse } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ============================================
// ADMIN HOOKS
// ============================================

export function useProposals() {
  return useQuery({
    queryKey: [api.proposals.list.path],
    queryFn: async () => {
      const res = await fetch(api.proposals.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch proposals');
      return api.proposals.list.responses[200].parse(await res.json());
    },
  });
}

export function useProposal(id: number) {
  return useQuery({
    queryKey: [api.proposals.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.proposals.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch proposal');
      return api.proposals.get.responses[200].parse(await res.json());
    },
    enabled: !!id
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CreateProposalRequest) => {
      const res = await fetch(api.proposals.create.path, {
        method: api.proposals.create.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.proposals.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error('Failed to create proposal');
      }
      return api.proposals.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.proposals.list.path] });
      toast({ title: "Success", description: "Proposal created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateProposalRequest) => {
      const url = buildUrl(api.proposals.update.path, { id });
      const res = await fetch(url, {
        method: api.proposals.update.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      
      if (!res.ok) {
        throw new Error('Failed to update proposal');
      }
      return api.proposals.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.proposals.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.proposals.get.path, data.id] });
      toast({ title: "Saved", description: "Proposal updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.proposals.delete.path, { id });
      const res = await fetch(url, { 
        method: api.proposals.delete.method, 
        credentials: "include" 
      });
      if (!res.ok) throw new Error('Failed to delete');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.proposals.list.path] });
      toast({ title: "Success", description: "Proposal deleted" });
    },
  });
}

// ============================================
// PUBLIC HOOKS
// ============================================

export function usePublicProposal(id: number) {
  return useQuery({
    queryKey: ["public-proposal", id],
    queryFn: async () => {
      const url = buildUrl(api.proposals.getByToken.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch proposal');
      return api.proposals.getByToken.responses[200].parse(await res.json());
    },
    enabled: !!id
  });
}

export function useSignProposal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, role, signature }: { id: number, role: 'noviq' | 'licensee', signature: string }) => {
      const url = buildUrl(api.proposals.sign.path, { id });
      const res = await fetch(url, {
        method: api.proposals.sign.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, signature }),
      });
      
      if (!res.ok) throw new Error('Failed to sign proposal');
      return api.proposals.sign.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["public-proposal", data.id] });
      // Also invalidate admin view if we happen to be logged in
      queryClient.invalidateQueries({ queryKey: [api.proposals.get.path, data.id] });
      toast({ title: "Signed", description: "Signature successfully recorded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}
