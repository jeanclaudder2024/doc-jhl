import React from 'react';
import { Link } from 'wouter';
import { useProposals, useCreateProposal, useDeleteProposal } from '@/hooks/use-proposals';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Eye, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminDashboard() {
  const { data: proposals, isLoading } = useProposals();
  const { mutateAsync: deleteProposal } = useDeleteProposal();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'signed': return 'bg-green-100 text-green-700 border-green-200';
      case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Proposals</h1>
          <p className="text-muted-foreground mt-1">Manage your client agreements</p>
        </div>
        <Link href="/admin/proposals/new">
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Client</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals?.length === 0 ? (
               <TableRow>
                 <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                   No proposals found. Create your first one!
                 </TableCell>
               </TableRow>
            ) : (
              proposals?.map((proposal) => (
                <TableRow key={proposal.id} className="group cursor-pointer">
                  <TableCell className="font-medium text-base">
                    {proposal.clientName}
                  </TableCell>
                  <TableCell>{proposal.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(proposal.status)}>
                      {proposal.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {proposal.createdAt && format(new Date(proposal.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/p/${proposal.id}`}>
                        <Button variant="ghost" size="icon" title="View Public Link">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </Button>
                      </Link>
                      <Link href={`/admin/proposals/${proposal.id}`}>
                        <Button variant="ghost" size="icon" title="Edit">
                          <FileText className="w-4 h-4" />
                        </Button>
                      </Link>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the proposal for {proposal.clientName}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteProposal(proposal.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </AdminLayout>
  );
}
