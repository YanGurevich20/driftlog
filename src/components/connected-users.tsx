'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UserPlus, Users, LogOut, Check, X, Mail, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { UserGroupsService } from '@/services/user-groups';
import { useConnectedUsers } from '@/hooks/use-connected-users';
import { useInvitations } from '@/hooks/use-invitations';
import { useSentInvitations } from '@/hooks/use-sent-invitations';
import { DataState } from '@/components/ui/data-state';
import type { GroupInvitation } from '@/types';
import { toast } from 'sonner';

export function ConnectedUsersInviteButton() {
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInviteUser = async () => {
    if (!user || !inviteEmail.trim()) return;
    
    setIsInviting(true);
    try {
      await UserGroupsService.inviteToGroup(
        user.groupId,
        user.id,
        user.displayName || user.email || 'User',
        inviteEmail
      );
      
      setInviteEmail('');
      setInviteDialogOpen(false);
      toast.success(`Invitation sent to ${inviteEmail}`);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-4 w-4">
          <UserPlus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Someone to Share Expenses</DialogTitle>
          <DialogDescription>
            They&apos;ll be able to see all your expenses and you&apos;ll see theirs
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@example.com"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={isInviting}>
              {isInviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectedUsersLeaveButton() {
  const { user } = useAuth();
  const { connectedUsers } = useConnectedUsers();

  const handleLeaveGroup = async () => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to leave this group? You will no longer see shared expenses.')) {
      return;
    }
    
    try {
      await UserGroupsService.leaveGroup(user.id);
      toast.success('Left the group successfully');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  // Only show if user has connected users
  if (connectedUsers.length === 0) {
    return null;
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-4 w-4"
      onClick={handleLeaveGroup}
      title="Leave group"
    >
      <LogOut />
    </Button>
  );
}

export function ConnectedUsers() {
  const { user } = useAuth();
  const { connectedUsers, loading: usersLoading, error: usersError } = useConnectedUsers();
  const { invitations, loading: invitationsLoading, error: invitationsError } = useInvitations();
  const { sentInvitations, loading: sentLoading, error: sentError } = useSentInvitations();

  if (usersError) {
    console.error('Error loading connected users:', usersError);
  }
  if (invitationsError) {
    console.error('Error loading invitations:', invitationsError);
  }
  if (sentError) {
    console.error('Error loading sent invitations:', sentError);
  }

  const loading = usersLoading || invitationsLoading || sentLoading;

  const handleAcceptInvitation = async (invitation: GroupInvitation) => {
    if (!user) return;
    
    if (connectedUsers.length > 0) {
      const confirmMessage = `You are currently connected with ${connectedUsers.length} ${connectedUsers.length === 1 ? 'person' : 'people'}. ` +
        `Accepting this invitation will disconnect you from them. Continue?`;
      
      if (!confirm(confirmMessage)) {
        return;
      }
    }
    
    try {
      await UserGroupsService.acceptInvitation(invitation.id, user.id);
      toast.success(`Joined group with ${invitation.inviterName}`);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitation: GroupInvitation) => {
    try {
      await UserGroupsService.rejectInvitation(invitation.id);
      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('Failed to reject invitation');
    }
  };

  const handleCancelInvitation = async (invitation: GroupInvitation) => {
    try {
      await UserGroupsService.cancelInvitation(invitation.id);
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const hasContent = connectedUsers.length > 0 || invitations.length > 0 || sentInvitations.length > 0;

  return (
    <DataState
      loading={loading}
      empty={!hasContent}
      loadingVariant="skeleton"
      emptyTitle="No connections yet"
      emptyDescription="Click the + icon above to invite someone"
      emptyIcon={Users}
    >
      <div className="space-y-2">
        {/* Pending Invitations */}
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 border border-primary/50 rounded-lg bg-primary/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">
                  {invitation.inviterName}
                </div>
                <div className="text-sm text-muted-foreground">
                  Invited you to share expenses
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAcceptInvitation(invitation)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRejectInvitation(invitation)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Sent Invitations */}
        {sentInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-3 border border-muted-foreground/30 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Send className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="font-medium">
                  {invitation.invitedEmail}
                </div>
                <div className="text-sm text-muted-foreground">
                  Invitation sent • Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCancelInvitation(invitation)}
              title="Cancel invitation"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {/* Connected Users */}
        {connectedUsers.map((connectedUser) => (
            <div
              key={connectedUser.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                {connectedUser.photoUrl ? (
                  <img 
                    src={connectedUser.photoUrl} 
                    alt={connectedUser.displayName || connectedUser.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="font-medium">
                    {connectedUser.displayName || connectedUser.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {connectedUser.email}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {connectedUser.displayCurrency}
              </div>
            </div>
        ))}
      </div>
    </DataState>
  );
}