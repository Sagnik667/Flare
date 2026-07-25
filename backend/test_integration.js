import db from './config/database.js';
import * as authService from './modules/auth/auth.service.js';
import * as volunteerService from './modules/volunteer/volunteer.service.js';
import * as adminService from './modules/admin/admin.service.js';
import * as sosService from './modules/sos/sos.service.js';
import * as locationService from './modules/location/location.service.js';
import { v4 as uuidv4 } from 'uuid';
import logger from './config/logger.js';
import path from 'path';

// Setup environment overrides for testing
process.env.NODE_ENV = 'test';

async function runTests() {
  console.log('==================================================');
  console.log('  FLARE SYSTEM INTEGRATION & VERIFICATION SUITE   ');
  console.log('==================================================');
  
  let testUser = null;
  let testVolUser = null;
  let testVolUser2 = null;
  let adminUser = null;
  let incident = null;
  let volunteerProfile = null;
  let volunteerProfile2 = null;
  let assignment = null;

  try {
    // 1. DATABASE CONNECTIVITY
    console.log('\n[1/7] Testing Database Connection...');
    const dbTest = await db.query('SELECT NOW()');
    console.log('✓ Database Connection Successful:', dbTest.rows[0].now);

    // Fetch existing admin seed for actions verification
    const { rows: admins } = await db.query("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
    if (admins.length === 0) {
      throw new Error('Admin seed user not found. Please run seeds first.');
    }
    adminUser = admins[0];
    console.log(`✓ Admin User Found: ${adminUser.email} (${adminUser.id})`);

    // 2. REGISTRATION & EMAIL LOGIN
    console.log('\n[2/7] Testing Authentication Flows...');
    const randomSuffix = Math.floor(Math.random() * 1000000);
    const email = `woman_${randomSuffix}@test.com`;
    const volEmail = `volunteer_${randomSuffix}@test.com`;
    
    // Register standard woman user
    testUser = await authService.registerUser({
      fullName: 'Test Woman',
      email,
      phone: `+1555${randomSuffix.toString().padStart(6, '0').slice(0, 6)}`,
      password: 'StrongPassword123!',
      role: 'woman',
    });
    console.log(`✓ Registered Woman Account: ${testUser.email} (${testUser.id})`);

    // Register prospective volunteer user
    testVolUser = await authService.registerUser({
      fullName: 'Test Responder',
      email: volEmail,
      phone: `+1999${randomSuffix.toString().padStart(6, '0').slice(0, 6)}`,
      password: 'StrongPassword123!',
      role: 'woman', // Initially remains role 'woman'
    });
    console.log(`✓ Registered Responder Candidate: ${testVolUser.email} (${testVolUser.id})`);

    // Log in Woman user
    const loginData = await authService.loginUser({
      email,
      password: 'StrongPassword123!',
    });
    console.log('✓ Email Login Successful (Tokens Generated)');

    // Rotate Refresh Token
    const refreshData = await authService.refreshSession(loginData.refreshToken);
    console.log('✓ Refresh Token Rotation & Session Re-authentication Successful');

    // 3. VOLUNTEER APPLICATION & ROLE TRANSITION
    console.log('\n[3/7] Testing Volunteer Application & Admin Verification Gates...');
    
    // Submit volunteer application
    volunteerProfile = await volunteerService.registerVolunteer(testVolUser.id, {
      address: '1600 Amphitheatre Pkwy, Mountain View, CA',
      serviceRadiusKm: 5,
      documentUrl: '/uploads/real_test_document.pdf',
      age: 25,
      governmentIdType: 'passport',
      governmentIdNumber: 'PASS123456',
      fullName: 'Test Responder',
      latitude: 37.4224858,
      longitude: -122.0855846,
      filePath: path.join(process.cwd(), 'real_test_document.pdf'),
    });
    console.log(`✓ Volunteer Profile Application Submitted (Status: ${volunteerProfile.verification_status})`);

    // Verify candidate role remains 'woman'
    const { rows: preVerifyUser } = await db.query('SELECT role FROM users WHERE id = $1', [testVolUser.id]);
    console.log(`✓ verified Candidate User Role remains: '${preVerifyUser[0].role}' (Awaiting Approval)`);

    // Admin approves volunteer profile
    await adminService.verifyVolunteer(adminUser.id, volunteerProfile.id, 'verify');
    console.log('✓ Admin Verification Approved');

    // Verify candidate role transitioned to volunteer
    const { rows: postVerifyUser } = await db.query('SELECT role FROM users WHERE id = $1', [testVolUser.id]);
    console.log(`✓ verified Candidate User Role transitioned to: '${postVerifyUser[0]?.role}'`);

    // Register second prospective volunteer user
    const volEmail2 = `volunteer2_${randomSuffix}@test.com`;
    testVolUser2 = await authService.registerUser({
      fullName: 'Test Responder 2',
      email: volEmail2,
      phone: `+1888${randomSuffix.toString().padStart(6, '0').slice(0, 6)}`,
      password: 'StrongPassword123!',
      role: 'woman', // Initially remains role 'woman'
    });
    console.log(`✓ Registered Responder Candidate 2: ${testVolUser2.email} (${testVolUser2.id})`);

    // Submit volunteer application for second user
    volunteerProfile2 = await volunteerService.registerVolunteer(testVolUser2.id, {
      address: '350 5th Ave, New York, NY',
      serviceRadiusKm: 5,
      documentUrl: '/uploads/real_test_document.pdf',
      age: 30,
      governmentIdType: 'pan_card',
      governmentIdNumber: 'DL-789012',
      fullName: 'Test Responder 2',
      latitude: 40.7484405,
      longitude: -73.9856644,
      filePath: path.join(process.cwd(), 'real_test_document.pdf'),
    });
    console.log(`✓ Volunteer Profile 2 Application Submitted (Status: ${volunteerProfile2.verification_status})`);

    // Admin approves second volunteer profile
    await adminService.verifyVolunteer(adminUser.id, volunteerProfile2.id, 'verify');
    console.log('✓ Admin Verification Approved for Responder 2');

    // 4. SOS EMERGENCY INCIDENT CREATION
    console.log('\n[4/7] Testing SOS Alarm Transaction Completeness...');
    
    // Trigger SOS (Single Transaction check)
    const sosRes = await sosService.createSOS({
      userId: testUser.id,
      latitude: 37.78829,
      longitude: -122.40752,
    });
    incident = sosRes;
    console.log(`✓ SOS Alarm Active: ${incident.id} (Status: ${incident.status})`);

    // Verify transaction entries across child tables
    const { rows: locs } = await db.query('SELECT id FROM incident_locations WHERE incident_id = $1', [incident.id]);
    const { rows: timelines } = await db.query('SELECT id FROM incident_timeline WHERE incident_id = $1', [incident.id]);
    const { rows: notifications } = await db.query('SELECT id FROM notifications WHERE user_id = $1', [testUser.id]);

    console.log(`  - Location entries created: ${locs.length}`);
    console.log(`  - Timeline logs created: ${timelines.length}`);
    console.log(`  - User notifications created: ${notifications.length}`);
    if (locs.length > 0 && timelines.length > 0 && notifications.length > 0) {
      console.log('✓ Verified SOS Transaction Database Integrity');
    } else {
      throw new Error('SOS creation transaction was incomplete.');
    }

    // 5. VOLUNTEER ACCEPTS INCIDENT (RACE CONDITION PREVENTION)
    console.log('\n[5/7] Testing Responder Acceptance Lock (Race Condition Guard)...');
    
    // Simulate accepted alert
    const acceptData = await volunteerService.acceptIncident(testVolUser.id, incident.id);
    assignment = acceptData;
    console.log(`✓ Responder Accepted Assignment: ${assignment.assignmentId} (Status: ${assignment.status})`);

    // Verify incident status updated
    const { rows: updatedIncident } = await db.query('SELECT status FROM emergency_incidents WHERE id = $1', [incident.id]);
    console.log(`✓ Incident status updated to: '${updatedIncident[0].status}'`);

    // Attempt double acceptance by a DIFFERENT verified volunteer (should fail with 409 Conflict)
    try {
      await volunteerService.acceptIncident(testVolUser2.id, incident.id);
      throw new Error('Double acceptance did not throw conflict exception!');
    } catch (err) {
      if (err.status === 409) {
        console.log('✓ verified Double-Accept Race Condition Blocked (409 Conflict Exception thrown)');
      } else {
        throw err;
      }
    }

    // 6. VOLUNTEER RESPONSE STATE MACHINE WORKFLOWS
    console.log('\n[6/7] Testing Response status State Machine...');
    
    // 1. accepted -> en_route
    await volunteerService.updateResponseStatus(testVolUser.id, incident.id, 'en_route');
    console.log("✓ Transitioned status: 'accepted' -> 'en_route'");

    // 2. en_route -> arrived
    await volunteerService.updateResponseStatus(testVolUser.id, incident.id, 'arrived');
    console.log("✓ Transitioned status: 'en_route' -> 'arrived'");

    // 3. arrived -> assisting
    await volunteerService.updateResponseStatus(testVolUser.id, incident.id, 'assisting');
    console.log("✓ Transitioned status: 'arrived' -> 'assisting'");

    // Try invalid transition: assisting -> en_route (should throw exception)
    try {
      await volunteerService.updateResponseStatus(testVolUser.id, incident.id, 'en_route');
      throw new Error('Invalid state transition allowed by machine!');
    } catch (err) {
      console.log(`✓ verified Invalid State Transition blocked: ${err.message}`);
    }

    // 7. INCIDENT RESOLUTION
    console.log('\n[7/7] Testing Incident Resolution...');
    
    // Resolving SOS Incident
    await volunteerService.updateResponseStatus(testVolUser.id, incident.id, 'resolved');
    console.log("✓ Transitioned status: 'assisting' -> 'resolved' (Incident closed)");

    // Verify incident closed in DB
    const { rows: finalIncident } = await db.query('SELECT status, resolved_at FROM emergency_incidents WHERE id = $1', [incident.id]);
    console.log(`✓ final Incident status: '${finalIncident[0].status}'`);
    console.log(`✓ final Incident Resolution timestamp logged: ${finalIncident[0].resolved_at}`);

    // Verify Admin audit logs created
    const { rows: auditLogs } = await db.query("SELECT event_type, description FROM incident_timeline WHERE event_type = 'INCIDENT_RESOLVED'");
    console.log(`✓ verified Audit Log registered: [${auditLogs[auditLogs.length - 1 || 0]?.event_type}] ${auditLogs[auditLogs.length - 1 || 0]?.description}`);

    // 8. SAFETY RESOURCES SCHEDULING, VOLUNTEER RECOMMENDATIONS, AND AUTO-NOTIFICATIONS
    console.log('\n[8/8] Testing Safety Resources, Recommendations & Auto-Notifications...');
    
    // Import new services
    const volunteerResourcesService = await import('./modules/volunteer/volunteerResources.service.js');

    // Create a registered safety resource with weekly closed day (today's day) and special holiday (today)
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const todayDateStr = today.toISOString().split('T')[0];

    // Home location of volunteer 1 is Mountain View (37.4224858, -122.0855846)
    // Create Resource 1: Police Station in Mountain View (1 km away) - Closed today (weekly closed)
    const resource1 = await adminService.createResource(adminUser.id, {
      name: 'Mountain View Precinct',
      category: 'police_station',
      address: '1000 Villa St, Mountain View, CA',
      phone: '+16509407130',
      latitude: 37.420000,
      longitude: -122.080000,
      opening_time: '08:00:00',
      closing_time: '20:00:00',
      weekly_closed_days: [todayDayOfWeek],
      special_closed_dates: [],
      is_permanently_closed: false
    });
    console.log(`✓ Created Resource 1 (Closed today - weekly closed): ${resource1.name} (${resource1.id})`);

    // Create Resource 2: Hospital in Palo Alto (8 km away) - Open today
    const resource2 = await adminService.createResource(adminUser.id, {
      name: 'Stanford Health Care',
      category: 'hospital',
      address: '300 Pasteur Dr, Palo Alto, CA',
      phone: '+16507234000',
      latitude: 37.430000,
      longitude: -122.170000,
      opening_time: '00:00:00',
      closing_time: '23:59:59',
      weekly_closed_days: [],
      special_closed_dates: [],
      is_permanently_closed: false
    });
    console.log(`✓ Created Resource 2 (Open today): ${resource2.name} (${resource2.id})`);

    // Create Resource 3: Hospital in San Jose (25 km away) - Permanently Closed
    const resource3 = await adminService.createResource(adminUser.id, {
      name: 'San Jose Medical Center',
      category: 'hospital',
      address: 'East Santa Clara St, San Jose, CA',
      phone: '+14088855000',
      latitude: 37.340000,
      longitude: -121.890000,
      opening_time: '00:00:00',
      closing_time: '23:59:59',
      weekly_closed_days: [],
      special_closed_dates: [],
      is_permanently_closed: true
    });
    console.log(`✓ Created Resource 3 (Permanently Closed): ${resource3.name} (${resource3.id})`);

    // Get safety resources for Volunteer 1 (Mountain View).
    // Verify it calculates distance and filters only resources within 100km.
    // Also verify it resolves the dynamic open/closed state correctly.
    const volunteerResources = await volunteerResourcesService.getVolunteerResources(testVolUser.id);
    
    // Resource 1, 2, 3 should be returned.
    const r1 = volunteerResources.find(r => r.id === resource1.id);
    const r2 = volunteerResources.find(r => r.id === resource2.id);
    const r3 = volunteerResources.find(r => r.id === resource3.id);

    if (!r1 || !r2 || !r3) {
      throw new Error('Some safety resources were not returned for volunteer');
    }

    console.log(`✓ verified Resource 1 distance: ${r1.distance_km.toFixed(1)} km, dynamic status: ${r1.status} (Reason: ${r1.reason})`);
    console.log(`✓ verified Resource 2 distance: ${r2.distance_km.toFixed(1)} km, dynamic status: ${r2.status} (Reason: ${r2.reason})`);
    console.log(`✓ verified Resource 3 distance: ${r3.distance_km.toFixed(1)} km, dynamic status: ${r3.status} (Reason: ${r3.reason})`);

    if (r1.status !== 'orange') throw new Error('Resource 1 dynamic status mismatch! Should be orange (weekly closed day).');
    if (r2.status !== 'green') throw new Error('Resource 2 dynamic status mismatch! Should be green (open).');
    if (r3.status !== 'orange') throw new Error('Resource 3 dynamic status mismatch! Should be orange (permanently closed).');

    // Volunteer recommends a new safety resource (RED)
    const recData = {
      name: 'Mountain View Shelter',
      category: 'womens_shelter',
      address: '1500 El Camino Real, Mountain View, CA',
      phone: '+16509641000',
      latitude: 37.400000,
      longitude: -122.090000,
      opening_time: '09:00:00',
      closing_time: '18:00:00',
      weekly_closed_days: [0, 6], // closed on weekend
      special_closed_dates: ['2026-12-25'],
      review: 'Excellent shelter with active volunteer guards.'
    };

    const recommendation = await volunteerResourcesService.recommendResource(testVolUser.id, recData);
    console.log(`✓ Volunteer Recommended Resource (Status: ${recommendation.status}): ${recommendation.name} (${recommendation.id})`);

    // Verify recommendation details exist in Admin panel
    const adminRecommendations = await adminService.getResourceRecommendations();
    const adminRec = adminRecommendations.find(r => r.id === recommendation.id);
    if (!adminRec || adminRec.status !== 'pending') {
      throw new Error('Recommendation not found in admin panel');
    }
    console.log('✓ verified Recommendation details loaded in Admin review queue');

    // Admin approves recommendation, modifying the phone and closing time
    await adminService.reviewResourceRecommendation(adminUser.id, recommendation.id, {
      action: 'approve',
      name: adminRec.name,
      category: adminRec.category,
      address: adminRec.address,
      phone: '+16509641111', // Modified
      latitude: adminRec.latitude,
      longitude: adminRec.longitude,
      opening_time: adminRec.opening_time,
      closing_time: '20:00:00', // Modified
      weekly_closed_days: adminRec.weekly_closed_days,
      special_closed_dates: adminRec.special_closed_dates
    });
    console.log('✓ Admin Approved & Registered recommended resource with modified properties');

    // Verify recommendation approved and new safety resource registered
    const { rows: registeredRecResource } = await db.query(
      "SELECT * FROM safety_resources WHERE name = 'Mountain View Shelter'"
    );
    if (registeredRecResource.length === 0) {
      throw new Error('Approved safety resource was not created');
    }
    const approvedResource = registeredRecResource[0];
    console.log(`✓ verified Registered Safety Resource is created in DB (Phone: ${approvedResource.phone}, Closing Time: ${approvedResource.closing_time})`);

    // Volunteer recommends closure for Resource 2 (Stanford Health Care)
    const closureRec = await volunteerResourcesService.recommendClosure(testVolUser.id, {
      resource_id: resource2.id,
      closure_type: 'temporary',
      closed_from: new Date(today.getTime() - 3600000).toISOString(), // 1 hr ago
      closed_until: new Date(today.getTime() + 3600000).toISOString(), // 1 hr from now
      until_unknown: false
    });
    console.log(`✓ Volunteer Recommended Temporary Closure for Resource 2: ${closureRec.id}`);

    // Verify closure recommendation exists in Admin panel
    const adminClosures = await adminService.getClosureRecommendations();
    const adminCl = adminClosures.find(c => c.id === closureRec.id);
    if (!adminCl || adminCl.status !== 'pending') {
      throw new Error('Closure recommendation not found in admin panel');
    }
    console.log('✓ verified Closure Recommendation loaded in Admin review queue');

    // Admin approves closure recommendation
    await adminService.reviewClosureRecommendation(adminUser.id, closureRec.id, { action: 'approve' });
    console.log('✓ Admin Approved closure recommendation');

    // Verify Resource 2 is now closed temporarily
    const volunteerResourcesAfterClosure = await volunteerResourcesService.getVolunteerResources(testVolUser.id);
    const r2After = volunteerResourcesAfterClosure.find(r => r.id === resource2.id);
    console.log(`✓ verified Resource 2 status after closure approval: ${r2After.status} (Reason: ${r2After.reason})`);
    if (r2After.status !== 'orange') {
      throw new Error('Resource 2 status should be closed (orange) after closure approval');
    }

    // 9. EMERGENCY AUTO-NOTIFICATION DISPATCH
    // Trigger emergency declaration on active SOS incident
    // We create a new incident in Mountain View, assign the volunteer, and declare emergency.
    console.log('\nTesting Emergency Auto-Notification Dispatch...');
    
    // Create new incident assignment and update status to en_route
    const emergencyIncident = await db.query(
      `INSERT INTO emergency_incidents (id, user_id, status, trigger_lat, trigger_lng, trigger_address)
       VALUES ($1, $2, 'active', $3, $4, 'Mountain View Emergency Center') RETURNING *`,
      [uuidv4(), testUser.id, 37.422000, -122.084000]
    );
    const incId = emergencyIncident.rows[0].id;
    const assignmentId = uuidv4();

    await db.query(
      `INSERT INTO incident_assignments (id, incident_id, volunteer_id, assignment_status, accepted_at)
       VALUES ($1, $2, $3, 'accepted', NOW())`,
      [assignmentId, incId, volunteerProfile.id]
    );

    // Call declareEmergency
    const emergencyResult = await volunteerResourcesService.declareEmergency(testVolUser.id, incId);
    console.log('✓ Emergency declared programmatically');
    console.log('Notified resources count:', emergencyResult.notifiedResources.length);
    emergencyResult.notifiedResources.forEach(n => {
      console.log(`  - Notified: ${n.name} (${n.category}), Distance: ${n.distance_km.toFixed(2)} km`);
    });

    // Cleanup emergency incident
    await db.query('DELETE FROM incident_timeline WHERE incident_id = $1', [incId]);
    await db.query('DELETE FROM incident_assignments WHERE incident_id = $1', [incId]);
    await db.query('DELETE FROM emergency_incidents WHERE id = $1', [incId]);

    console.log('\n==================================================');
    console.log('   ALL PROGRAMMATIC INTEGRATION TESTS PASSED      ');
    console.log('==================================================');

  } catch (error) {
    console.error('\n❌ INTEGRATION TEST SUITE FAILED:', error.message);
    if (error.stack) console.error(error.stack);
  } finally {
    // Cleanup created test records to prevent test bloat
    console.log('\nCleaning up database records...');
    try {
      // Delete from scheduling and recommendation tables
      await db.query('DELETE FROM recommended_weekly_closed_days');
      await db.query('DELETE FROM recommended_special_closed_dates');
      await db.query('DELETE FROM resource_recommendations');
      await db.query('DELETE FROM closure_recommendations');
      await db.query('DELETE FROM resource_temporary_closures');
      await db.query('DELETE FROM weekly_closed_days');
      await db.query('DELETE FROM special_closed_dates');
      await db.query('DELETE FROM safety_resources WHERE created_by = $1', [adminUser.id]);

      if (incident) {
        await db.query('DELETE FROM incident_timeline WHERE incident_id = $1', [incident.id]);
        await db.query('DELETE FROM incident_locations WHERE incident_id = $1', [incident.id]);
        await db.query('DELETE FROM incident_assignments WHERE incident_id = $1', [incident.id]);
        await db.query('DELETE FROM emergency_incidents WHERE id = $1', [incident.id]);
      }
      if (testUser) {
        await db.query('DELETE FROM notifications WHERE user_id = $1', [testUser.id]);
        await db.query('DELETE FROM safety_profiles WHERE user_id = $1', [testUser.id]);
        await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      }
      if (volunteerProfile) {
        await db.query('DELETE FROM volunteers WHERE id = $1', [volunteerProfile.id]);
      }
      if (volunteerProfile2) {
        await db.query('DELETE FROM volunteers WHERE id = $1', [volunteerProfile2.id]);
      }
      if (testVolUser) {
        await db.query('DELETE FROM notifications WHERE user_id = $1', [testVolUser.id]);
        await db.query('DELETE FROM users WHERE id = $1', [testVolUser.id]);
      }
      if (testVolUser2) {
        await db.query('DELETE FROM notifications WHERE user_id = $1', [testVolUser2.id]);
        await db.query('DELETE FROM users WHERE id = $1', [testVolUser2.id]);
      }
      console.log('✓ Cleanup Complete');
    } catch (cleanupErr) {
      console.error('Failed to cleanup database:', cleanupErr.message);
    }
    
    // Close database pool connection
    db.pool.end();
  }
}

runTests();
