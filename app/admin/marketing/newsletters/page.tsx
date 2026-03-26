'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Send, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  subject: string;
  content: string;
  status: 'draft' | 'sending' | 'sent';
  sent_at: string | null;
  recipients_count: number;
  created_at: string;
}

interface Stats {
  totalSubscribers: number;
  avgOpenRate: string;
  avgClickRate: string;
  activeCampaigns: number;
}

export default function NewslettersPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSubscribers: 0,
    avgOpenRate: '0%',
    avgClickRate: '0%',
    activeCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: 'Confirm',
    onConfirm: () => {},
  });

  // Form state
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
  });

  const handleOpenCreateModal = (campaign: Campaign | null = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        subject: campaign.subject,
        content: campaign.content,
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        subject: '',
        content: '',
      });
    }
    setIsCreateModalOpen(true);
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/newsletter/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns);
      setStats(data.stats);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const url = editingCampaign 
        ? `/api/admin/newsletter/campaigns/${editingCampaign.id}` 
        : '/api/admin/newsletter/campaigns';
      const method = editingCampaign ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(`Failed to ${editingCampaign ? 'update' : 'create'} campaign`);

      toast.success(`Campaign ${editingCampaign ? 'updated' : 'created'} successfully`);
      setIsCreateModalOpen(false);
      setFormData({ subject: '', content: '' });
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${editingCampaign ? 'update' : 'create'} campaign`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSend = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Send Newsletter',
      description: 'Are you sure you want to send this newsletter to all active subscribers? This action cannot be undone.',
      actionLabel: 'Send Now',
      onConfirm: async () => {
        try {
          setIsSending(id);
          const response = await fetch(`/api/admin/newsletter/campaigns/${id}/send`, {
            method: 'POST',
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to send campaign');

          toast.success(`Newsletter sent to ${data.recipients_count} subscribers!`);
          fetchCampaigns();
        } catch (error) {
          console.error(error);
          toast.error(error instanceof Error ? error.message : 'Failed to send campaign');
        } finally {
          setIsSending(null);
        }
      }
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Campaign',
      description: 'Are you sure you want to delete this campaign? This action is permanent.',
      actionLabel: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/newsletter/campaigns/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) throw new Error('Failed to delete campaign');

          toast.success('Campaign deleted');
          fetchCampaigns();
        } catch (error) {
          console.error(error);
          toast.error('Failed to delete campaign');
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletters</h1>
          <p className="text-muted-foreground mt-1">Manage email newsletters and campaigns</p>
        </div>
        <Button className="gap-2" onClick={() => handleOpenCreateModal()}>
          <Plus className="h-4 w-4" />
          Create Newsletter
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Active subscribers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate}</div>
            <p className="text-xs text-muted-foreground mt-1">Average open rate (Estimated)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgClickRate}</div>
            <p className="text-xs text-muted-foreground mt-1">Average click rate (Estimated)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sent Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
            <p className="text-xs text-muted-foreground mt-1">Total delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Newsletters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Newsletter Campaigns</CardTitle>
          <CardDescription>View and manage all newsletter campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No campaigns found</p>
              <p className="text-muted-foreground">Create your first newsletter to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.subject}</TableCell>
                    <TableCell>
                      {campaign.sent_at ? format(new Date(campaign.sent_at), 'yyyy-MM-dd HH:mm') : '-'}
                    </TableCell>
                    <TableCell>{campaign.recipients_count}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          campaign.status === 'sent' ? 'default' : 
                          campaign.status === 'sending' ? 'secondary' : 'outline'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {campaign.status === 'draft' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => handleSend(campaign.id)}
                            disabled={isSending === campaign.id}
                          >
                            {isSending === campaign.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )}
                            Send
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0" 
                          disabled={campaign.status !== 'draft'}
                          onClick={() => handleOpenCreateModal(campaign)}
                          title="Edit Campaign"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(campaign.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Newsletter' : 'Create Newsletter'}</DialogTitle>
            <DialogDescription>
              {editingCampaign ? 'Update your newsletter campaign.' : 'Create a new email campaign to send to your subscribers.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="subject" className="text-sm font-medium">Subject</label>
                <Input
                  id="subject"
                  placeholder="e.g., Weekly Trading Tips"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="content" className="text-sm font-medium">Content (HTML supported)</label>
                <Textarea
                  id="content"
                  placeholder="Write your newsletter content here..."
                  className="min-h-[300px]"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateModalOpen(false)} 
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCampaign ? 'Save Changes' : 'Save Draft'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, isOpen: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.onConfirm}
              className={confirmDialog.isDestructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmDialog.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

