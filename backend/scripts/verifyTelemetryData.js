/**
 * Verify Telemetry Data in Firebase
 * Run: node scripts/verifyTelemetryData.js [busId]
 * Example: node scripts/verifyTelemetryData.js NA-225566
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { db } = require('../firebase');

async function verifyTelemetryData() {
    const busId = process.argv[2] || 'NA-225566';
    
    console.log('\n📍 Verifying Telemetry Data for Bus:', busId);
    console.log('='.repeat(60));

    try {
        // 1. Check bus_live_locations collection
        console.log('\n🔍 Checking bus_live_locations collection...');
        const liveLocationDoc = await db.collection('bus_live_locations').doc(busId).get();
        
        if (liveLocationDoc.exists) {
            const liveData = liveLocationDoc.data();
            console.log('✅ Found live location data:');
            console.log('   Bus ID:', liveData.bus_id);
            console.log('   Route ID:', liveData.route_id);
            console.log('   Route Name:', liveData.route_name);
            console.log('   Latitude:', liveData.latitude);
            console.log('   Longitude:', liveData.longitude);
            console.log('   Speed:', liveData.speed, 'km/h');
            console.log('   Passenger Count:', liveData.passenger_count);
            console.log('   Total Weight:', liveData.total_weight);
            console.log('   GPS Valid:', liveData.gps_valid);
            console.log('   Status:', liveData.status);
            console.log('   Last Updated:', liveData.last_updated?.toDate?.() || liveData.last_updated);
            console.log('   Device Timestamp:', liveData.device_timestamp);
        } else {
            console.log('❌ No live location data found for this bus');
        }

        // 2. Check buses collection
        console.log('\n🔍 Checking buses collection...');
        const busesQuery = await db.collection('buses')
            .where('busId', '==', busId)
            .limit(1)
            .get();
        
        if (!busesQuery.empty) {
            const busData = busesQuery.docs[0].data();
            console.log('✅ Found bus data:');
            console.log('   Bus ID:', busData.busId);
            console.log('   Bus Number:', busData.busNumber);
            console.log('   Route ID:', busData.routeId);
            console.log('   Status:', busData.status);
            console.log('   Occupancy:', busData.occupancy);
            console.log('   Speed:', busData.speed);
            console.log('   Location:', busData.location);
            console.log('   Created At:', busData.createdAt);
            console.log('   Updated At:', busData.updatedAt);
        } else {
            console.log('❌ No bus data found in buses collection');
        }

        // 3. Check bus_passenger_events collection
        console.log('\n🔍 Checking recent passenger events...');
        const passengerEventsQuery = await db.collection('bus_passenger_events')
            .where('bus_id', '==', busId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        
        if (!passengerEventsQuery.empty) {
            console.log(`✅ Found ${passengerEventsQuery.docs.length} recent passenger events:`);
            passengerEventsQuery.docs.forEach((doc, index) => {
                const event = doc.data();
                console.log(`\n   Event ${index + 1}:`);
                console.log('   - In Count:', event.in_count);
                console.log('   - Out Count:', event.out_count);
                console.log('   - Total Passengers:', event.total_passenger_count);
                console.log('   - Weight:', event.total_weight);
                console.log('   - Location:', `(${event.latitude}, ${event.longitude})`);
                console.log('   - Timestamp:', event.timestamp?.toDate?.() || event.timestamp);
            });
        } else {
            console.log('❌ No passenger events found');
        }

        // 4. Check bus_telemetry_history collection
        console.log('\n🔍 Checking telemetry history (last 10 records)...');
        const telemetryHistoryQuery = await db.collection('bus_telemetry_history')
            .where('bus_id', '==', busId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        if (!telemetryHistoryQuery.empty) {
            console.log(`✅ Found ${telemetryHistoryQuery.docs.length} telemetry records:`);
            telemetryHistoryQuery.docs.forEach((doc, index) => {
                const record = doc.data();
                console.log(`\n   Record ${index + 1}:`);
                console.log('   - Speed:', record.speed, 'km/h');
                console.log('   - Location:', `(${record.latitude}, ${record.longitude})`);
                console.log('   - Passengers:', record.passenger_count);
                console.log('   - Weight:', record.total_weight);
                console.log('   - GPS Valid:', record.gps_valid);
                console.log('   - Timestamp:', record.timestamp?.toDate?.() || record.timestamp);
            });
        } else {
            console.log('❌ No telemetry history found');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✨ Verification complete!\n');

    } catch (error) {
        console.error('❌ Error verifying data:', error.message);
    } finally {
        process.exit(0);
    }
}

// Run verification
verifyTelemetryData();
