'use client';

import { Plus, Edit, Trash2, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockTestimonials = [
  { id: 1, name: 'John Smith', email: 'john@example.com', rating: 5, comment: 'Excellent trading tools! Helped me improve my strategy significantly.', product: 'Trading Analytics Dashboard', status: 'published', date: '2025-01-15' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@example.com', rating: 5, comment: 'The course material is comprehensive and well-structured. Highly recommend!', product: 'Trading Course Online', status: 'published', date: '2025-01-12' },
  { id: 3, name: 'Mike Davis', email: 'mike@example.com', rating: 4, comment: 'Good value for money. The software is intuitive and easy to use.', product: 'Portfolio Management Tool', status: 'pending', date: '2025-01-18' },
  { id: 4, name: 'Emily Wilson', email: 'emily@example.com', rating: 5, comment: 'Outstanding support team and quality products. Will definitely purchase again!', product: 'Market Analysis Software', status: 'published', date: '2025-01-10' },
];

export default function TestimonialsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-muted-foreground mt-1">Manage customer testimonials and reviews</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Testimonial
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">124</div>
            <p className="text-xs text-green-600 mt-1">+12 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98</div>
            <p className="text-xs text-muted-foreground mt-1">79% of total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">26</div>
            <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.7</div>
            <p className="text-xs text-green-600 mt-1">Out of 5.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Testimonials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Testimonials</CardTitle>
          <CardDescription>View and manage all customer testimonials</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTestimonials.map((testimonial) => (
                <TableRow key={testimonial.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{testimonial.product}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < testimonial.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{testimonial.comment}</TableCell>
                  <TableCell>
                    <Badge variant={testimonial.status === 'published' ? 'default' : 'secondary'}>
                      {testimonial.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{testimonial.date}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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

