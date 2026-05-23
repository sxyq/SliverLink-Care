export interface ElderBasicInfo {
  id: string;
  archiveNo: string;
  name: string;
  gender: string;
  age: number;
  emergencyContact: string;
  emergencyPhoneMasked: string;
  emergencyPhoneDial: string;
  relationship: string;
  aboType: string;
  rhType: string;
  allergySummary: string;
}

export interface QrResolveResponse {
  basicInfo: ElderBasicInfo;
  token: string;
}
