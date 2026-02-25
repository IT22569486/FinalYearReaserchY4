/*
 * Smart Bus Safe Speed Prediction System
 * ESP32 Firmware v2.0
 * 
 * Features:
 * - WiFi Configuration Portal
 * - REST API communication with backend
 * - Safe speed display on OLED/LCD
 * - Preferences storage (NVS)
 * 
 * Hardware Requirements:
 * - ESP32 DevKit
 * - SSD1306 OLED Display (optional, I2C)
 * - GPS Module (optional, for real GPS data)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// Uncomment if using OLED display
// #include <Wire.h>
// #include <Adafruit_GFX.h>
// #include <Adafruit_SSD1306.h>

// OLED Display Configuration (if used)
// #define SCREEN_WIDTH 128
// #define SCREEN_HEIGHT 64
// #define OLED_RESET -1
// Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

WebServer server(80);
Preferences prefs;

// ========================================
// CONFIGURATION VARIABLES
// ========================================

String wifi_ssid;
String wifi_pass;
String vehicle_id;
String route_id;

// Backend Server URL - Connected to local Flask server
const char *serverURL = "http://192.168.1.24:5000/predict";

// Data sending interval (milliseconds)
const unsigned long SEND_INTERVAL = 5000;
unsigned long lastSendTime = 0;

// ========================================
// SIMULATED SENSOR DATA
// Replace with actual sensor readings in production
// ========================================

float gps_latitude = 6.912843;
float gps_longitude = 79.858041;
int passenger_count = 25;
float passenger_load_kg = 1500.0;

// Last received safe speed
float safe_speed = 0.0;
String location_name = "Unknown";
String road_condition = "Dry";

// Ordered route stops loaded from CSV (row order preserved)
struct Stop
{
  const char *stop_id;
  const char *stop_name;
  float latitude;
  float longitude;
  const char *direction;
};

const Stop ROUTE_STOPS[] = {
    {"R177_KAD_001", "Kaduwela ", 6.936372181, 79.98325019, "To Kaduwela"},
    {"R177_KAD_002", "Kaduwela Town", 6.935329641, 79.98397893, "To Kaduwela"},
    {"R177_KAD_003", "Kothalawala Temple", 6.932240099, 79.98248311, "To Kaduwela"},
    {"R177_KAD_004", "Kothalawala School Kaduwela", 6.930063653, 79.98248458, "To Kaduwela"},
    {"R177_KAD_005", "Pattiyawatte", 6.926965583, 79.98018084, "To Kaduwela"},
    {"R177_KAD_006", "Kothalawala Kaduwela", 6.925070248, 79.97862329, "To Kaduwela"},
    {"R177_KAD_007", "Vihara Mawatha Kaduwela", 6.921322874, 79.97505344, "To Kaduwela"},
    {"R177_KAD_008", "Seewalee Mawatha Kaduwela", 6.920005321, 79.97424854, "To Kaduwela"},
    {"R177_KAD_009", "Gemunupura", 6.917404122, 79.9736739, "To Kaduwela"},
    {"R177_KAD_010", "Weliwita Junction", 6.916074544, 79.97248612, "To Kaduwela"},
    {"R177_KAD_011", "Slit Campus Malabe", 6.914507475, 79.97221689, "To Kaduwela"},
    {"R177_KAD_012", "Sudarshana Mawatha", 6.908749956, 79.96619973, "To Kaduwela"},
    {"R177_KAD_013", "Cinec Campus Rd", 6.905666784, 79.96306153, "To Kaduwela"},
    {"R177_KAD_014", "Godalla Watte Rd", 6.904424168, 79.9610217, "To Kaduwela"},
    {"R177_KAD_015", "", 6.903731328, 79.95936841, "To Kaduwela"},
    {"R177_KAD_016", "Malabe School Bus Stop", 6.903885495, 79.95606184, "To Kaduwela"},
    {"R177_KAD_017", "Millagahawatta Rd", 6.904965359, 79.94997676, "To Kaduwela"},
    {"R177_KAD_018", "Dambugahawatta Rd", 6.906235395, 79.94743113, "To Kaduwela"},
    {"R177_KAD_019", "Thalahena Junction", 6.907848815, 79.94517289, "To Kaduwela"},
    {"R177_KAD_020", "Laktharu Mawatha", 6.908439844, 79.94139676, "To Kaduwela"},
    {"R177_KAD_021", "8th Post Bus Stop", 6.908385827, 79.93989726, "To Kaduwela"},
    {"R177_KAD_022", "Kotte-Bope Road", 6.90845406, 79.93843988, "To Kaduwela"},
    {"R177_KAD_023", "Sri Subodhi Junior School", 6.908384829, 79.93666962, "To Kaduwela"},
    {"R177_KAD_024", "Koswatta Bus Stop", 6.908008284, 79.92927693, "To Kaduwela"},
    {"R177_KAD_025", "Koswatta Bus Stop", 6.906072691, 79.92854788, "To Kaduwela"},
    {"R177_KAD_026", "Koswaththa (Talangama Ctb Bus Depot)", 6.90595793, 79.92629212, "To Kaduwela"},
    {"R177_KAD_027", "Ganahena", 6.904294271, 79.92397595, "To Kaduwela"},
    {"R177_KAD_028", "", 6.903577064, 79.92193559, "To Kaduwela"},
    {"R177_KAD_029", "Kanatta Road Battaramulla", 6.902769086, 79.92027462, "To Kaduwela"},
    {"R177_KAD_030", "Battaramulla", 6.902235201, 79.91808393, "To Kaduwela"},
    {"R177_KAD_031", "Sathsiripaya", 6.902255984, 79.91583919, "To Kaduwela"},
    {"R177_KAD_032", "Parliment Junction", 6.903192466, 79.91168618, "To Kaduwela"},
    {"R177_KAD_033", "Ethulkotte New Bus Stop", 6.903290307, 79.90757212, "To Kaduwela"},
    {"R177_KAD_034", "", 6.905930664, 79.90482503, "To Kaduwela"},
    {"R177_KAD_035", "Hsbc Rajagiriya Bus Stop", 6.906667261, 79.9020666, "To Kaduwela"},
    {"R177_KAD_036", "Rajagiriya", 6.907728084, 79.89983057, "To Kaduwela"},
    {"R177_KAD_037", "Rajagiriya Bus Stop", 6.910234139, 79.89434179, "To Kaduwela"},
    {"R177_KAD_038", "Golden Key Hospital Bus Stop", 6.910881719, 79.88924039, "To Kaduwela"},
    {"R177_KAD_039", "Castle Street Bus Stop", 6.911047224, 79.88496702, "To Kaduwela"},
    {"R177_KAD_040", "House Of Fashion Bus Station", 6.911394347, 79.87683624, "To Kaduwela"},
    {"R177_KAD_041", "Horton Gardens", 6.911435631, 79.87333217, "To Kaduwela"},
    {"R177_KAD_042", "", 6.911621534, 79.86844969, "To Kaduwela"},
    {"R177_KAD_043", "Colombo Public Library Bus Stop", 6.912843389, 79.85804166, "To Kaduwela"},
    {"R177_KAD_044", "Ndb Dharmapala Mawatha Bus Stop", 6.913278917, 79.8570135, "To Kaduwela"},
    {"R177_KAD_045", "Dharmapala Mawatha Bus Stop", 6.912629349, 79.85387378, "To Kaduwela"},
    {"R177_KAD_046", "Kollupitiya Supermarket Bus Station", 6.912076031, 79.85075444, "To Kaduwela"},
    {"R177_KAD_047", "Kollupitiya Bus Stop", 6.911120442, 79.84917074, "To Kaduwela"},
    {"R177_KOL_001", "Kaduwela Town", 6.935333968, 79.98413093, "To Kollupitiya"},
    {"R177_KOL_002", "Kothalawala Temple", 6.932419555, 79.98256885, "To Kollupitiya"},
    {"R177_KOL_003", "Kothalawala School Kaduwela", 6.930208516, 79.98261151, "To Kollupitiya"},
    {"R177_KOL_004", "Pattiyawatte", 6.926886422, 79.98027653, "To Kollupitiya"},
    {"R177_KOL_005", "Kothalawala Kaduwela", 6.92504169, 79.97880219, "To Kollupitiya"},
    {"R177_KOL_006", "Vihara Mawatha Kaduwela", 6.921321161, 79.97520876, "To Kollupitiya"},
    {"R177_KOL_007", "Seewalee Mawatha Kaduwela", 6.920152454, 79.97443542, "To Kollupitiya"},
    {"R177_KOL_008", "Gemunupura", 6.917253399, 79.97374323, "To Kollupitiya"},
    {"R177_KOL_009", "SLIIT Campus Bus Station", 6.915499768, 79.97237865, "To Kollupitiya"},
    {"R177_KOL_010", "Wimukthi Mawatha Bus Stop", 6.912339917, 79.97225746, "To Kollupitiya"},
    {"R177_KOL_011", "Pittugala Bus Stop", 6.910091045, 79.97149814, "To Kollupitiya"},
    {"R177_KOL_012", "Temple Road", 6.908914019, 79.96986802, "To Kollupitiya"},
    {"R177_KOL_013", "Sudarshana Mawatha", 6.908701361, 79.96626813, "To Kollupitiya"},
    {"R177_KOL_014", "Sandagiri Mawatha", 6.906549519, 79.96485955, "To Kollupitiya"},
    {"R177_KOL_015", "Cinec Campus Rd", 6.90564881, 79.96311249, "To Kollupitiya"},
    {"R177_KOL_016", "Godalla Watte Rd", 6.904357599, 79.96107535, "To Kollupitiya"},
    {"R177_KOL_017", "", 6.90366609, 79.95938987, "To Kollupitiya"},
    {"R177_KOL_018", "Malabe Junction Bus Stop", 6.903915639, 79.95512945, "To Kollupitiya"},
    {"R177_KOL_019", "Millagahawatta Rd", 6.904939235, 79.94988585, "To Kollupitiya"},
    {"R177_KOL_020", "Dambugahawatta Rd", 6.906088942, 79.94761773, "To Kollupitiya"},
    {"R177_KOL_021", "Thalahena Junction Bus Stop", 6.908493335, 79.94426734, "To Kollupitiya"},
    {"R177_KOL_022", "Laktharu Mawatha", 6.90833866, 79.94167303, "To Kollupitiya"},
    {"R177_KOL_023", "Sri Subodhi Junior School", 6.908300952, 79.93660524, "To Kollupitiya"},
    {"R177_KOL_024", "", 6.907350354, 79.93209657, "To Kollupitiya"},
    {"R177_KOL_025", "Koswatta Bus Stop", 6.907487153, 79.92910607, "To Kollupitiya"},
    {"R177_KOL_026", "Koswaththa (Talangama Ctb Bus Depot)", 6.905942761, 79.92590653, "To Kollupitiya"},
    {"R177_KOL_027", "Ganahena", 6.90405154, 79.92383921, "To Kollupitiya"},
    {"R177_KOL_028", "", 6.903489193, 79.92193157, "To Kollupitiya"},
    {"R177_KOL_029", "Kanatta Road Battaramulla", 6.902703848, 79.92029071, "To Kollupitiya"},
    {"R177_KOL_030", "Battaramulla", 6.902022512, 79.91795383, "To Kollupitiya"},
    {"R177_KOL_031", "Sathsiripaya", 6.902127359, 79.91582651, "To Kollupitiya"},
    {"R177_KOL_032", "Sethsiripaya Bus Stop", 6.902316415, 79.91463527, "To Kollupitiya"},
    {"R177_KOL_033", "Parliament Junction", 6.903009401, 79.9117006, "To Kollupitiya"},
    {"R177_KOL_034", "Ethulkotte New Bus Stop", 6.903427122, 79.90707245, "To Kollupitiya"},
    {"R177_KOL_035", "", 6.905773446, 79.90472451, "To Kollupitiya"},
    {"R177_KOL_036", "Hsbc Rajagiriya Bus Stop", 6.90662043, 79.90182297, "To Kollupitiya"},
    {"R177_KOL_037", "Rajagiriya", 6.907511557, 79.89976798, "To Kollupitiya"},
    {"R177_KOL_038", "Rajagiriya Bus Stop", 6.910089161, 79.89440248, "To Kollupitiya"},
    {"R177_KOL_039", "Golden Key Hospital Bus Stop", 6.910750996, 79.88901213, "To Kollupitiya"},
    {"R177_KOL_040", "House Of Fashion Bus Stop", 6.911363738, 79.87305456, "To Kollupitiya"},
    {"R177_KOL_041", "Kollupitiya Bus Stop", 6.91145983, 79.86845281, "To Kollupitiya"}
};

const size_t ROUTE_STOP_COUNT = sizeof(ROUTE_STOPS) / sizeof(ROUTE_STOPS[0]);
size_t currentStopIndex = 0;

// ========================================
// HTML CONFIGURATION PAGE
// ========================================

String htmlPage()
{
  return R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ESP32 Bus Configuration</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      max-width: 450px;
      width: 100%;
    }
    h2 {
      color: #333;
      text-align: center;
      margin-bottom: 30px;
      font-size: 24px;
    }
    .form-section {
      margin-bottom: 25px;
      padding-bottom: 25px;
      border-bottom: 1px solid #eee;
    }
    .form-section:last-of-type {
      border-bottom: none;
      margin-bottom: 15px;
    }
    .section-title {
      color: #667eea;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      color: #555;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    input {
      width: 100%;
      padding: 12px 15px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.3s;
      outline: none;
    }
    input:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    input::placeholder {
      color: #aaa;
    }
    button {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-top: 10px;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    button:active {
      transform: translateY(0);
    }
    .info-text {
      font-size: 12px;
      color: #888;
      margin-top: 5px;
    }
    .status-box {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .status-item:last-child {
      margin-bottom: 0;
    }
    .status-label {
      color: #666;
      font-size: 13px;
    }
    .status-value {
      color: #333;
      font-weight: 600;
      font-size: 13px;
    }
    .speed-display {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .speed-value {
      font-size: 48px;
      font-weight: 800;
      color: white;
    }
    .speed-unit {
      font-size: 18px;
      color: rgba(255,255,255,0.8);
    }
    .speed-label {
      color: rgba(255,255,255,0.9);
      font-size: 14px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>🚌 Bus Configuration</h2>
    
    <div class="speed-display">
      <div class="speed-value">)rawliteral" + String(safe_speed, 1) + R"rawliteral(<span class="speed-unit"> km/h</span></div>
      <div class="speed-label">Safe Speed</div>
    </div>
    
    <div class="status-box">
      <div class="status-item">
        <span class="status-label">Location:</span>
        <span class="status-value">)rawliteral" + location_name + R"rawliteral(</span>
      </div>
      <div class="status-item">
        <span class="status-label">Road:</span>
        <span class="status-value">)rawliteral" + road_condition + R"rawliteral(</span>
      </div>
      <div class="status-item">
        <span class="status-label">Vehicle:</span>
        <span class="status-value">)rawliteral" + vehicle_id + R"rawliteral(</span>
      </div>
    </div>
    
    <form action="/save" method="POST">
      <div class="form-section">
        <div class="section-title">📶 WiFi Settings</div>
        <div class="form-group">
          <label for="ssid">Network Name (SSID)</label>
          <input type="text" id="ssid" name="ssid" placeholder="Enter WiFi SSID" required>
        </div>
        <div class="form-group">
          <label for="pass">WiFi Password</label>
          <input type="password" id="pass" name="pass" placeholder="Enter WiFi password" required>
          <div class="info-text">Make sure credentials are correct</div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-title">🚌 Bus Information</div>
        <div class="form-group">
          <label for="vehicle">Vehicle ID</label>
          <input type="text" id="vehicle" name="vehicle" placeholder="e.g., BUS_001" required>
        </div>
        <div class="form-group">
          <label for="route">Route ID</label>
          <input type="text" id="route" name="route" placeholder="e.g., 177_Kaduwela_Kollupitiya" required>
        </div>
      </div>
      
      <button type="submit">💾 Save & Connect</button>
    </form>
  </div>
</body>
</html>
)rawliteral";
}

// ========================================
// WEB SERVER HANDLERS
// ========================================

void handleRoot()
{
  server.send(200, "text/html", htmlPage());
}

void handleSave()
{
  prefs.begin("config", false);

  prefs.putString("ssid", server.arg("ssid"));
  prefs.putString("pass", server.arg("pass"));
  prefs.putString("vehicle", server.arg("vehicle"));
  prefs.putString("route", server.arg("route"));

  prefs.end();

  String response = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          color: white;
          text-align: center;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 15px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          color: #333;
        }
        h2 { color: #10b981; margin-bottom: 15px; }
        p { color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>✅ Configuration Saved!</h2>
        <p>ESP32 will restart and connect to WiFi.</p>
        <p style="margin-top: 20px; font-size: 14px;">Please wait...</p>
      </div>
    </body>
    </html>
  )rawliteral";

  server.send(200, "text/html", response);
  
  delay(2000);
  ESP.restart();
}

void handleStatus()
{
  StaticJsonDocument<512> doc;
  doc["vehicle_id"] = vehicle_id;
  doc["route_id"] = route_id;
  doc["safe_speed"] = safe_speed;
  doc["location_name"] = location_name;
  doc["road_condition"] = road_condition;
  doc["latitude"] = gps_latitude;
  doc["longitude"] = gps_longitude;
  doc["passenger_count"] = passenger_count;
  doc["wifi_connected"] = WiFi.status() == WL_CONNECTED;
  doc["wifi_rssi"] = WiFi.RSSI();

  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

// ========================================
// DISPLAY FUNCTIONS (for OLED)
// ========================================

void updateDisplay()
{
  // Uncomment if using OLED display
  /*
  display.clearDisplay();
  
  // Draw speed
  display.setTextSize(3);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 5);
  display.print(String(safe_speed, 0));
  
  display.setTextSize(1);
  display.setCursor(80, 15);
  display.print("km/h");
  
  // Draw location
  display.setTextSize(1);
  display.setCursor(0, 35);
  display.print("Loc: ");
  display.print(location_name.substring(0, 12));
  
  // Draw road condition
  display.setCursor(0, 48);
  display.print("Road: ");
  display.print(road_condition);
  
  // Draw WiFi status
  if (WiFi.status() == WL_CONNECTED) {
    display.setCursor(100, 48);
    display.print("WiFi");
  }
  
  display.display();
  */
  
  // Serial output for debugging
  Serial.println("=== Display Update ===");
  Serial.print("Safe Speed: ");
  Serial.print(safe_speed);
  Serial.println(" km/h");
  Serial.print("Location: ");
  Serial.println(location_name);
  Serial.print("Road: ");
  Serial.println(road_condition);
  Serial.println("=====================");
}

// ========================================
// SEND DATA TO BACKEND
// ========================================

void sendDataToServer()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi not connected, skipping data send");
    return;
  }

  HTTPClient http;
  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["vehicle_id"] = vehicle_id;
  doc["route_id"] = route_id;
  doc["gps_latitude"] = gps_latitude;
  doc["gps_longitude"] = gps_longitude;
  doc["passenger_count"] = passenger_count;
  doc["passenger_load_kg"] = passenger_load_kg;

  String payload;
  serializeJson(doc, payload);

  Serial.println("Sending payload:");
  Serial.println(payload);

  int httpCode = http.POST(payload);

  if (httpCode > 0)
  {
    String response = http.getString();
    Serial.print("Response code: ");
    Serial.println(httpCode);
    Serial.println("Response:");
    Serial.println(response);

    // Parse response
    StaticJsonDocument<256> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error)
    {
      safe_speed = responseDoc["safe_speed"] | 40.0;
      location_name = responseDoc["location_name"] | "Unknown";
      road_condition = responseDoc["road_condition"] | "Dry";
      
      updateDisplay();
    }
    else
    {
      Serial.print("JSON parse error: ");
      Serial.println(error.c_str());
    }
  }
  else
  {
    Serial.print("HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ========================================
// SIMULATE SENSOR UPDATES
// In production, replace with actual sensor readings
// ========================================

void updateSensorData()
{
  // Step through real route stops in original CSV order
  const Stop &stop = ROUTE_STOPS[currentStopIndex];
  gps_latitude = stop.latitude;
  gps_longitude = stop.longitude;
  location_name = stop.stop_name;

  // Advance to next stop, loop when complete
  currentStopIndex = (currentStopIndex + 1) % ROUTE_STOP_COUNT;

  // Simulate varying passenger counts and load
  int change = (int)random(-8, 9); // bigger swing for variation
  passenger_count = constrain(passenger_count + change, 0, 70);

  // Average passenger weight varies per reading (55-85 kg)
  int avg_weight = (int)random(55, 86);
  passenger_load_kg = passenger_count * avg_weight;
}


// SETUP
// ========================================

void setup()
{
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("Smart Bus Safe Speed Prediction System");
  Serial.println("ESP32 Firmware v2.0");
  Serial.println("========================================");

  // Initialize OLED (if used)
  /*
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 allocation failed");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Initializing...");
    display.display();
  }
  */

  // Load saved configuration
  prefs.begin("config", true);
  wifi_ssid = prefs.getString("ssid", "");
  wifi_pass = prefs.getString("pass", "");
  vehicle_id = prefs.getString("vehicle", "BUS_001");
  route_id = prefs.getString("route", "177_Kaduwela_Kollupitiya");
  prefs.end();

  Serial.print("Vehicle ID: ");
  Serial.println(vehicle_id);
  Serial.print("Route ID: ");
  Serial.println(route_id);

  // If no WiFi saved → AP MODE (Configuration Portal)
  if (wifi_ssid == "")
  {
    Serial.println("\n[CONFIG MODE] Starting Configuration Portal...");
    WiFi.softAP("ESP32-BUS-SETUP", "busconfig123");

    Serial.print("Connect to WiFi: ESP32-BUS-SETUP");
    Serial.print("\nPassword: busconfig123");
    Serial.print("\nOpen browser: http://");
    Serial.println(WiFi.softAPIP());

    server.on("/", handleRoot);
    server.on("/save", HTTP_POST, handleSave);
    server.on("/status", handleStatus);
    server.begin();
  }
  else
  {
    Serial.println("\n[CONNECT MODE] Connecting to WiFi...");
    Serial.print("SSID: ");
    Serial.println(wifi_ssid);
    
    WiFi.begin(wifi_ssid.c_str(), wifi_pass.c_str());

    int timeout = 0;
    while (WiFi.status() != WL_CONNECTED && timeout < 40)
    {
      delay(500);
      Serial.print(".");
      timeout++;
    }

    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.println("\n✅ WiFi Connected!");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      Serial.print("Signal Strength: ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm");
      
      // Start web server for status page
      server.on("/", handleRoot);
      server.on("/status", handleStatus);
      server.begin();
      Serial.println("Status page available at http://" + WiFi.localIP().toString());
    }
    else
    {
      Serial.println("\n❌ WiFi Connection Failed!");
      Serial.println("Clearing saved credentials and restarting...");

      // Clear wrong credentials
      prefs.begin("config", false);
      prefs.putString("ssid", "");
      prefs.putString("pass", "");
      prefs.end();

      delay(2000);
      ESP.restart();
    }
  }

  randomSeed(analogRead(0));
}

// ========================================
// MAIN LOOP
// ========================================

void loop()
{
  // Always handle web server requests
  server.handleClient();

  // If in AP mode (configuration), don't send data
  if (WiFi.getMode() == WIFI_AP)
  {
    return;
  }

  // Send data at regular intervals
  unsigned long currentTime = millis();
  if (currentTime - lastSendTime >= SEND_INTERVAL)
  {
    lastSendTime = currentTime;
    
    // Update simulated sensors
    updateSensorData();
    
    // Send to server
    sendDataToServer();
  }
}
