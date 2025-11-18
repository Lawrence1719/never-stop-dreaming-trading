'use client';

import { MapPin, Package, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockDeliveries = [
  { id: '#1024', customer: 'John Doe', location: 'On the way', status: 'in_transit', delivery: 'Today by 6 PM', driver: 'Mike Johnson' },
  { id: '#1023', customer: 'Jane Smith', location: 'Distribution Center', status: 'processing', delivery: 'Tomorrow by 3 PM', driver: 'Sarah Lee' },
  { id: '#1022', customer: 'Bob Johnson', location: 'Out for Delivery', status: 'out_delivery', delivery: 'Today by 4 PM', driver: 'James Wilson' },
  { id: '#1021', customer: 'Alice Williams', location: 'Delivered', status: 'delivered', delivery: 'Delivered', driver: 'Tom Brown' },
];

export default function TrackingPage() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'out_delivery':
        return 'default';
      case 'delivered':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Order Tracking</h1>
        <p className="text-muted-foreground mt-1">Monitor real-time delivery status</p>
      </div>

      {/* Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Map</CardTitle>
          <CardDescription>Active delivery vehicles on the map</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted h-64 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Interactive map view</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deliveries</CardTitle>
          <CardDescription>Tracking all ongoing deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Est. Delivery</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDeliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.id}</TableCell>
                    <TableCell>{delivery.customer}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {delivery.location}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(delivery.status)}>
                        {delivery.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {delivery.delivery}
                    </TableCell>
                    <TableCell>{delivery.driver}</TableCell>
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
