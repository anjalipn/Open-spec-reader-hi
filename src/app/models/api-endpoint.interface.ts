export interface ApiEndpoint {
  signature: string;  // Will now contain both path and HTTP verb
  resourceInPayload: boolean;
  resourceInUrl: boolean;
  crValidationRequired: boolean;
  incidentValidation: boolean;
  changeInPayload: boolean;
  changeInUrl: boolean;
  incidentInPayload: boolean;
  incidentInUrl: boolean;
  estimatedTime: number;
} 