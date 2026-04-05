'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Eye,
  Edit,
  Bike,
  Ban,
  UserCheck,
  Trash2,
  RefreshCcw,
} from 'lucide-react';

export interface CustomerRowModel {
  id: string;
  role: string;
  status: string; // 'active', 'blocked', 'deleted'
}

interface CustomerRowActionsProps {
  customer: CustomerRowModel;
  currentUserId: string | null;
  currentUserIsSuperAdmin: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onAssignCourier: () => void;
  onRemoveCourier: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

export function CustomerRowActions({
  customer,
  currentUserId,
  currentUserIsSuperAdmin,
  onViewDetails,
  onEdit,
  onAssignCourier,
  onRemoveCourier,
  onDeactivate,
  onActivate,
  onDelete,
  onRestore,
  onPermanentDelete,
}: CustomerRowActionsProps) {
  const isCurrentUser = customer.id === currentUserId;
  const canChangeRoles = currentUserIsSuperAdmin && !isCurrentUser;
  const canManageAccount = !isCurrentUser;
  const isCourier = customer.role === 'courier';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2" onClick={onViewDetails}>
          <Eye className="h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={onEdit}>
          <Edit className="h-4 w-4" />
          Edit Customer
        </DropdownMenuItem>
        {canChangeRoles && (
          <>
            <DropdownMenuSeparator />
            {customer.role === 'customer' ? (
              <DropdownMenuItem className="gap-2" onClick={onAssignCourier}>
                <Bike className="h-4 w-4" />
                Assign as Courier
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="gap-2" onClick={onRemoveCourier}>
                <Bike className="h-4 w-4" />
                Remove Courier
              </DropdownMenuItem>
            )}
          </>
        )}
        {!currentUserIsSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              Only Super Admin can change roles
            </DropdownMenuItem>
          </>
        )}
        {canManageAccount && (
          <>
            <DropdownMenuSeparator />
            {customer.status === 'active' ? (
              <DropdownMenuItem className="gap-2 text-destructive" onClick={onDeactivate}>
                <Ban className="h-4 w-4" />
                {isCourier ? 'Deactivate' : 'Deactivate Customer'}
              </DropdownMenuItem>
            ) : customer.status === 'blocked' ? (
              <DropdownMenuItem className="gap-2" onClick={onActivate}>
                <UserCheck className="h-4 w-4" />
                Activate
              </DropdownMenuItem>
            ) : null}
            
            {customer.status === 'deleted' ? (
              <>
                <DropdownMenuItem className="gap-2 text-blue-500" onClick={onRestore}>
                  <RefreshCcw className="h-4 w-4" />
                  Restore Account
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-destructive font-bold" onClick={onPermanentDelete}>
                  <Trash2 className="h-4 w-4" />
                  Permanent Delete
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem className="gap-2 text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                {isCourier ? 'Delete' : 'Delete Customer'}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
