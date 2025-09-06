'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAvatar } from '@/components/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserPlus, Users, LogOut, Check, X, Mail, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth-context';
import { useConnectedUsers } from '@/hooks/use-connected-users';
import { useInvitations } from '@/hooks/use-invitations';
import { useSentInvitations } from '@/hooks/use-sent-invitations';
import { DataState } from '@/components/ui/data-state';
import type { GroupInvitation } from '@/types';
import { toast } from 'sonner';
import { ConnectionsService } from '@/services/connections';

export function ConnectedUsersInviteButton() {
  const { user } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const handleInviteUser = async () => {
    if (!user || !inviteEmail.trim()) return;
    
    // Prevent self-invitation
    if (inviteEmail.toLowerCase() === user.email?.toLowerCase()) {
      toast.warning('You cannot invite yourself');
      return;
    }
    
    setIsInviting(true);
    try {
      await ConnectionsService.invite(user.id, user.displayName || user.email || 'User', inviteEmail);
      
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
        <Button variant="ghost" size="icon">
          <UserPlus />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite someone to share expenses</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an invitation to connect. Once accepted, you&apos;ll be able to see each other&apos;s expenses.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="invite-email">Email Address</Label>
          <div className="flex gap-2">
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="friend@example.com"
              className="flex-1"
            />
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteUser} disabled={isInviting}>
              {isInviting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConnectionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}

function ConnectionCard({ icon, title, subtitle, actions }: ConnectionCardProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {icon}
        <div className="space-y-1">
          {title && <div className="font-medium">{title}</div>}
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      {actions}
    </div>
  );
}

export function ConnectedUsersLeaveButton() {
  const { user } = useAuth();
  const { connectedUsers } = useConnectedUsers();
  const [leaveGroupDialogOpen, setLeaveGroupDialogOpen] = useState(false);

  const handleLeaveGroup = async () => {
    if (!user) return;
    
    try {
      await ConnectionsService.leave(user.id);
      toast.success('Left the group successfully');
      setLeaveGroupDialogOpen(false);
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
    <>
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => setLeaveGroupDialogOpen(true)}
        title="Leave group"
      >
        <LogOut />
      </Button>

      <AlertDialog open={leaveGroupDialogOpen} onOpenChange={setLeaveGroupDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave the group? You will no longer see shared expenses with {connectedUsers.length} {connectedUsers.length === 1 ? 'person' : 'people'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ConnectedUsers() {
  const { user } = useAuth();
  const { connectedUsers, loading: usersLoading, error: usersError } = useConnectedUsers();
  const { invitations, loading: invitationsLoading, error: invitationsError } = useInvitations();
  const { sentInvitations, loading: sentLoading, error: sentError } = useSentInvitations();
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState<GroupInvitation | null>(null);

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
      // Show confirmation dialog first
      setPendingInvitation(invitation);
      setConfirmDialogOpen(true);
      return;
    }
    
    // Proceed directly if no existing connections
    await proceedWithAcceptInvitation(invitation);
  };

  const proceedWithAcceptInvitation = async (invitation: GroupInvitation) => {
    if (!user) return;
    
    try {
      await ConnectionsService.accept(invitation.id, user.id);
      toast.success(`Connected with ${invitation.inviterName}`);
      setConfirmDialogOpen(false);
      setPendingInvitation(null);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    }
  };

  const handleConfirmAccept = () => {
    if (pendingInvitation) {
      proceedWithAcceptInvitation(pendingInvitation);
    }
  };

  const handleCancelAccept = () => {
    setConfirmDialogOpen(false);
    setPendingInvitation(null);
  };

  const handleRejectInvitation = async (invitation: GroupInvitation) => {
    try {
      await ConnectionsService.reject(invitation.id);
      toast.success('Invitation declined');
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      toast.error('Failed to reject invitation');
    }
  };

  const handleCancelInvitation = async (invitation: GroupInvitation) => {
    try {
      await ConnectionsService.cancel(invitation.id);
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const hasContent = connectedUsers.length > 0 || invitations.length > 0 || sentInvitations.length > 0;

  return (
    <>
      <DataState
      loading={loading}
      empty={!hasContent}
      error={usersError || invitationsError || sentError}
      loadingVariant="skeleton"
      emptyTitle="No connections"
      emptyDescription="Click the + icon above to invite someone"
      emptyIcon={Users}
    >
      <div className="space-y-3">
        {/* Pending Invitations */}
        {invitations.map((invitation, index) => (
          <div key={invitation.id}>
            <ConnectionCard
              icon={
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="size-4 text-primary" />
                </div>
              }
              title={invitation.inviterName}
              subtitle="Invited you to share expenses"
              actions={
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleAcceptInvitation(invitation)}
                  >
                    <Check />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRejectInvitation(invitation)}
                  >
                    <X />
                  </Button>
                </div>
              }
            />
            {(index < invitations.length - 1 || sentInvitations.length > 0 || connectedUsers.length > 0) && (
              <Separator className="mt-3" />
            )}
          </div>
        ))}

        {/* Sent Invitations */}
        {sentInvitations.map((invitation, index) => (
          <div key={invitation.id}>
            <ConnectionCard
              icon={
                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="size-4 text-muted-foreground" />
                </div>
              }
              title={invitation.invitedEmail}
              subtitle={`Invitation sent • Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`}
              actions={
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleCancelInvitation(invitation)}
                  title="Cancel invitation"
                >
                  <X />
                </Button>
              }
            />
            {(index < sentInvitations.length - 1 || connectedUsers.length > 0) && (
              <Separator className="mt-3" />
            )}
          </div>
        ))}

        {/* Connected Users */}
        {connectedUsers.map((connectedUser, index) => (
          <div key={connectedUser.id}>
            <ConnectionCard
              icon={<UserAvatar user={connectedUser} />}
              title={connectedUser.displayName || connectedUser.name}
              subtitle={connectedUser.email}
            />
            {index < connectedUsers.length - 1 && (
              <Separator className="mt-3" />
            )}
          </div>
        ))}
      </div>
      </DataState>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect current connections?</AlertDialogTitle>
            <AlertDialogDescription>
              You are currently connected with {connectedUsers.length} {connectedUsers.length === 1 ? 'person' : 'people'}. 
              Accepting this invitation will disconnect you from them and connect you with {pendingInvitation?.inviterName} instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}