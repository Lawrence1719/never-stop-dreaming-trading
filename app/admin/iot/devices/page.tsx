'use client';

import { Plus, Settings, Trash2, Wifi, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockDevices = [
  { id: 'TEMP-01', name: 'Temperature Sensor A', type: 'Temperature', location: 'Warehouse Zone A', status: 'online', battery: 95, lastUpdate: '2 min ago' },
  { id: 'HUM-01', name: 'Humidity Sensor B', type: 'Humidity', location: 'Warehouse Zone B', status: 'online', battery: 87, lastUpdate: '5 min ago' },
  { id: 'RFID-01', name: 'RFID Reader Gate 1', type: 'RFID Reader', location: 'Gate 1', status: 'online', battery: 100, lastUpdate: '1 min ago' },
  { id: 'GPS-01', name: 'Delivery GPS Tracker 1', type: 'GPS Tracker', location: 'Vehicle 1', status: 'offline', battery: 45, lastUpdate: '30 min ago' },
];

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IoT Devices</h1>
          <p className="text-muted-foreground mt-1">Manage connected IoT devices</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Device
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Devices</CardTitle>
          <CardDescription>Connected sensors and tracking devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Battery</TableHead>
                  <TableHead>Last Update</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDevices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-mono text-sm">{device.id}</TableCell>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell className="text-sm">{device.type}</TableCell>
                    <TableCell className="text-sm">{device.location}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === 'online' ? 'default' : 'destructive'} className="flex w-fit gap-1">
                        {device.status === 'online' ? (
                          <Wifi className="h-3 w-3" />
                        ) : (
                          <WifiOff className="h-3 w-3" />
                        )}
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{device.battery}%</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{device.lastUpdate}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
