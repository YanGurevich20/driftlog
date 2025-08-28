import * as admin from "firebase-admin";

admin.initializeApp();

// Import and export all functions
export { scheduledUpdateExchangeRates } from "./scheduledUpdateExchangeRates";
export { acceptConnectionInvitation } from "./acceptConnectionInvitation";
export { leaveConnections } from "./leaveConnections";
