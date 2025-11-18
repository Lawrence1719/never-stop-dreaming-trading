'use client';

import { Plus, Edit, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const mockPages = [
  { id: 1, title: 'About Us', slug: 'about', status: 'published', modified: '2024-01-10', author: 'Admin' },
  { id: 2, title: 'Terms & Conditions', slug: 'terms', status: 'published', modified: '2023-12-01', author: 'Admin' },
  { id: 3, title: 'Privacy Policy', slug: 'privacy', status: 'published', modified: '2024-01-05', author: 'Admin' },
  { id: 4, title: 'Contact Us', slug: 'contact', status: 'draft', modified: '2024-01-15', author: 'Manager' },
];

export default function PagesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground mt-1">Manage static pages and content</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Page
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Pages</CardTitle>
          <CardDescription>Static pages on your website</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">/{page.slug}</TableCell>
                    <TableCell>
                      <Badge variant={page.status === 'published' ? 'default' : 'outline'}>
                        {page.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{page.modified}</TableCell>
                    <TableCell className="text-sm">{page.author}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3 w-3" />
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
