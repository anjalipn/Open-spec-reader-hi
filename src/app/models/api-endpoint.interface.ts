export interface ApiEndpoint {
  signature: string;  // Will now contain both path and HTTP verb
  resourceInPayload: string;
  resourceInUrl: string;
  crValidationRequired: boolean;
  incidentValidationRequired: boolean;
  changeInPayload: string;
  changeInUrl: string;
  incidentInPayload: string;
  incidentInUrl: string;
  estimatedTime: number;
} 