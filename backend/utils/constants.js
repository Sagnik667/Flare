export const ROLES = {
  WOMAN: 'woman',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
};


export const INCIDENT_STATUS = {
  ACTIVE: 'active',
  VOLUNTEER_ASSIGNED: 'volunteer_assigned',
  VOLUNTEER_EN_ROUTE: 'volunteer_en_route',
  VOLUNTEER_ARRIVED: 'volunteer_arrived',
  ASSISTING: 'assisting',
  RESOLVED: 'resolved',
  CANCELLED: 'cancelled',
};

export const VOLUNTEER_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const ASSIGNMENT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  ASSISTING: 'assisting',
  RESOLVED: 'resolved',
};

export const RESOURCE_CATEGORIES = {
  POLICE_STATION: 'police_station',
  HOSPITAL: 'hospital',
  SAFE_ZONE: 'safe_zone',
  WOMENS_SHELTER: 'womens_shelter',
  CLINIC: 'clinic',
  OTHER: 'other',
};

export const NOTIFICATION_TYPES = {
  SOS_CREATED: 'sos_created',
  VOLUNTEER_ASSIGNED: 'volunteer_assigned',
  VOLUNTEER_ACCEPTED: 'volunteer_accepted',
  VOLUNTEER_ARRIVED: 'volunteer_arrived',
  INCIDENT_RESOLVED: 'incident_resolved',
  VOLUNTEER_VERIFIED: 'volunteer_verified',
  VOLUNTEER_REJECTED: 'volunteer_rejected',
  SYSTEM: 'system',
};

export default {
  ROLES,
  USER_STATUS,
  INCIDENT_STATUS,
  VOLUNTEER_STATUS,
  ASSIGNMENT_STATUS,
  RESOURCE_CATEGORIES,
  NOTIFICATION_TYPES,
};
