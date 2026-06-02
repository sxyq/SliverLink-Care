export interface ScanBasicInfo {
  elderId: string;
  archiveNo: string;
  name: string;
  gender: string;
  age: number;
  residence: string;
  emergencyContactName: string;
  emergencyPhoneMasked: string;
  emergencyPhoneDial: string;
  relationship: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

export interface ScanResolveRequest {
  token: string;
}
