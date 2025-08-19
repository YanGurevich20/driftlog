export interface GroupInvitation {
  id: string;
  groupId: string;
  invitedEmail: string;
  invitedBy: string;
  inviterName: string;
  createdAt: Date;
  expiresAt: Date;
}


