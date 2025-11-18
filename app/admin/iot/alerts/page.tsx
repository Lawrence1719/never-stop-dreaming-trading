'use client';

import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockAlerts = [
  { id: 1, type: 'Low Stock', severity: 'critical', message: 'USB-C Cable stock below threshold', time: '5 min ago', status: 'new' },
  { id: 2, type: 'Temperature', severity: 'warning', message: 'Warehouse temperature exceeds 25°C', time: '15 min ago', status: 'new' },
  { id: 3, type: 'Delivery Delay', severity: 'warning', message: 'Order #1021 delayed by 2 hours', time: '1 hour ago', status: 'acknowledged' },
  { id: 4, type: 'Device Offline', severity: 'critical', message: 'GPS Tracker GPT-01 went offline', time: '2 hours ago', status: 'resolved' },
];

export default function AlertsPage() {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Alerts</h1>
          <p className="text-muted-foreground mt-1">Monitor system notifications and warnings</p>
        </div>
        <Button variant="outline">Mark All as Read</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
          <CardDescription>Real-time system alerts and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="flex items-center gap-2">
                      {getIcon(alert.severity)}
                      {alert.type}
                    </TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={alert.status === 'new' ? 'default' : 'outline'}>
                        {alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{alert.time}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
