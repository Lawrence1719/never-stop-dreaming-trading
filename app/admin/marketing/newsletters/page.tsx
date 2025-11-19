'use client';

import { Plus, Edit, Trash2, Send, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockNewsletters = [
  { id: 1, subject: 'Weekly Trading Tips', sentDate: '2025-01-15', recipients: 1250, openRate: '24.5%', clickRate: '8.2%', status: 'sent' },
  { id: 2, subject: 'New Product Launch', sentDate: '2025-01-18', recipients: 1850, openRate: '31.2%', clickRate: '12.5%', status: 'sent' },
  { id: 3, subject: 'Monthly Market Analysis', sentDate: null, recipients: 0, openRate: '-', clickRate: '-', status: 'draft' },
  { id: 4, subject: 'Special Offer - Limited Time', sentDate: '2025-01-20', recipients: 2100, openRate: '28.7%', clickRate: '15.3%', status: 'sent' },
];

export default function NewslettersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletters</h1>
          <p className="text-muted-foreground mt-1">Manage email newsletters and campaigns</p>
        </div>
        <Button className="gap-2">
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
            <div className="text-2xl font-bold">2,450</div>
            <p className="text-xs text-green-600 mt-1">+125 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28.1%</div>
            <p className="text-xs text-green-600 mt-1">+2.3% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.0%</div>
            <p className="text-xs text-green-600 mt-1">+1.5% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">1 draft</p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Sent Date</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Open Rate</TableHead>
                <TableHead>Click Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockNewsletters.map((newsletter) => (
                <TableRow key={newsletter.id}>
                  <TableCell className="font-medium">{newsletter.subject}</TableCell>
                  <TableCell>{newsletter.sentDate || '-'}</TableCell>
                  <TableCell>{newsletter.recipients}</TableCell>
                  <TableCell>{newsletter.openRate}</TableCell>
                  <TableCell>{newsletter.clickRate}</TableCell>
                  <TableCell>
                    <Badge variant={newsletter.status === 'sent' ? 'default' : 'secondary'}>
                      {newsletter.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {newsletter.status === 'draft' && (
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Send className="h-3 w-3" />
                          Send
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

