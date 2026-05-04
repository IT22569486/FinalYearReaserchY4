/**
 * Example: Verify Telemetry Data via API
 * 
 * Once the backend is running (npm start), you can verify telemetry data using:
 */

// 1. Get current live telemetry data
// GET http://localhost:3000/buses/NA-225566/telemetry
// Response:
// {
//   "status": "success",
//   "data": {
//     "bus_id": "NA-225566",
//     "route_id": "177_Kaduwela_Kollupitiya",
//     "route_name": "Kaduwela to Kollupitiya",
//     "latitude": 6.911394,
//     "longitude": 79.87684,
//     "speed": 38,
//     "passenger_count": 27,
//     "total_weight": 1770,
//     "gps_valid": true,
//     "status": "online",
//     "last_updated": "2026-05-04T12:48:53.846Z",
//     "device_timestamp": 271025
//   }
// }

// 2. Get telemetry history (last 100 records)
// GET http://localhost:3000/buses/NA-225566/telemetry/history
// Response:
// {
//   "status": "success",
//   "bus_id": "NA-225566",
//   "total_records": 100,
//   "data": [
//     {
//       "bus_id": "NA-225566",
//       "route_id": "177_Kaduwela_Kollupitiya",
//       "latitude": 6.911394,
//       "longitude": 79.87684,
//       "speed": 38,
//       "passenger_count": 27,
//       "total_weight": 1770,
//       "gps_valid": true,
//       "timestamp": "2026-05-04T12:48:53.846Z",
//       "device_timestamp": 271025
//     },
//     ...
//   ]
// }

// 3. Get custom number of records
// GET http://localhost:3000/buses/NA-225566/telemetry/history?limit=50
// Returns only the last 50 records

// 4. Using cURL from terminal:
// curl http://localhost:3000/buses/NA-225566/telemetry
// curl http://localhost:3000/buses/NA-225566/telemetry/history?limit=10

// 5. Using Postman or similar API client:
// - Set method to GET
// - Enter URL: http://localhost:3000/buses/NA-225566/telemetry
// - Click Send

console.log("Telemetry API Endpoints Available:");
console.log("====================================");
console.log("1. Current Telemetry (Live Data)");
console.log("   GET /buses/{busId}/telemetry");
console.log("   Example: GET /buses/NA-225566/telemetry");
console.log("");
console.log("2. Telemetry History (All Records)");
console.log("   GET /buses/{busId}/telemetry/history");
console.log("   Example: GET /buses/NA-225566/telemetry/history");
console.log("");
console.log("3. Telemetry History with Limit");
console.log("   GET /buses/{busId}/telemetry/history?limit=50");
console.log("   Example: GET /buses/NA-225566/telemetry/history?limit=50");
console.log("");
console.log("Database Collections:");
console.log("=====================");
console.log("- bus_live_locations: Current real-time location & telemetry");
console.log("- bus_telemetry_history: All historical telemetry records");
console.log("- bus_passenger_events: Passenger activity events");
console.log("- buses: Main bus configuration & status");
