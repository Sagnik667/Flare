export const ROLES = {
  WOMAN: 'woman',
  VOLUNTEER: 'volunteer',
  ADMIN: 'admin',
};

export const ROLE_HOME = {
  woman: '/dashboard',
  volunteer: '/volunteer',
  admin: '/admin',
};

export const INCIDENT_STATUS_LABELS = {
  active: 'Critical Alert',
  volunteer_assigned: 'Responder Assigned',
  volunteer_en_route: 'Responder En Route',
  volunteer_arrived: 'Responder Arrived',
  assisting: 'Assistance Active',
  resolved: 'Resolved (Safe)',
  cancelled: 'Cancelled',
};

export const INCIDENT_STATUS_COLORS = {
  active: 'bg-sos text-text-primary border-sos',
  volunteer_assigned: 'bg-warning/20 text-warning border-warning/50',
  volunteer_en_route: 'bg-info/20 text-info border-info/50',
  volunteer_arrived: 'bg-info/30 text-info border-info',
  assisting: 'bg-accent/20 text-accent border-accent/50',
  resolved: 'bg-success/20 text-success border-success/50',
  cancelled: 'bg-text-muted/20 text-text-secondary border-text-muted',
};

export const RESOURCE_CATEGORY_LABELS = {
  police_station: 'Police Station',
  hospital: 'Hospital',
  clinic: 'Medical Clinic',
  womens_shelter: "Women's Shelter",
  safe_zone: 'Community Safe Zone',
  other: 'Safety Resource',
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default {
  ROLES,
  ROLE_HOME,
  INCIDENT_STATUS_LABELS,
  INCIDENT_STATUS_COLORS,
  RESOURCE_CATEGORY_LABELS,
  BLOOD_GROUPS,
};
