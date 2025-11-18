'use client';

import { Plus, Edit, Trash2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const mockFaqs = [
  { id: 1, question: 'What is your return policy?', category: 'Returns', answer: 'We offer 30-day returns on all items.', status: 'published' },
  { id: 2, question: 'How long does shipping take?', category: 'Shipping', answer: 'Standard shipping takes 5-7 business days.', status: 'published' },
  { id: 3, question: 'Do you offer international shipping?', category: 'Shipping', answer: 'Yes, we ship to 50+ countries worldwide.', status: 'published' },
  { id: 4, question: 'What payment methods do you accept?', category: 'Payment', answer: 'We accept all major credit cards and PayPal.', status: 'draft' },
];

export default function FaqsPage() {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FAQs</h1>
          <p className="text-muted-foreground mt-1">Manage frequently asked questions</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create FAQ
        </Button>
      </div>

      <div className="space-y-3">
        {mockFaqs.map((faq) => (
          <Card key={faq.id}>
            <Collapsible open={openId === faq.id} onOpenChange={(open) => setOpenId(open ? faq.id : null)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{faq.question}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{faq.category}</Badge>
                      <Badge variant={faq.status === 'published' ? 'default' : 'outline'} className="text-xs">
                        {faq.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={(e) => e.stopPropagation()}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openId === faq.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground border-t">
                {faq.answer}
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}
