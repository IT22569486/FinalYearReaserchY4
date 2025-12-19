#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>

// OLED display
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

String wifi_ssid;
String wifi_pass;
String vehicle_id;
String route_id;

// Backend uRL
const char *serverURL = "https://safe-speed-api.onrender.com/predict";


const unsigned long SEND_INTERVAL = 5000;
unsigned long lastSendTime = 0;

// SIMULATED SENSOR DATA

float gps_latitude = 6.912843;
float gps_longitude = 79.858041;
int passenger_count = 25;
float passenger_load_kg = 1500.0;

// Last received safe speed
float safe_speed = 0.0;
String location_name = "Unknown";
String road_condition = "Dry";


// CONFIGURATION PAGE HTML
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
    <h2>Bus Configuration</h2>
    
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
        <div class="section-title">WiFi Settings</div>
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
        <div class="section-title">Bus Information</div>
        <div class="form-group">
          <label for="vehicle">Vehicle ID</label>
          <input type="text" id="vehicle" name="vehicle" placeholder="e.g., BUS_001" required>
        </div>
        <div class="form-group">
          <label for="route">Route ID</label>
          <input type="text" id="route" name="route" placeholder="e.g., 177_Kaduwela_Kollupitiya" required>
        </div>
      </div>
      
      <button type="submit">Save & Connect</button>
    </form>
  </div>
</body>
</html>
)rawliteral";
}

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
        <h2>Configuration Saved!</h2>
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

// display update function
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

// SEND DATA TO SERVER
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
  http.setTimeout(30000);
  // Set connection timeout
  http.setConnectTimeout(30000);

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
  

// SIMULATE SENSOR UPDATES
void updateSensorData()
{
  // Simulate GPS movement
  gps_latitude += (int)random(-10, 10) * 0.0001;
  gps_longitude += (int)random(-10, 10) * 0.0001;
  
  // Keep within Colombo bounds
  gps_latitude = constrain(gps_latitude, 6.85, 6.98);
  gps_longitude = constrain(gps_longitude, 79.82, 80.00);
  
  // Simulate passenger changes
  int change = (int)random(-3, 4);
  passenger_count = passenger_count + change;
  if (passenger_count < 0) passenger_count = 0;
  if (passenger_count > 50) passenger_count = 50;
  passenger_load_kg = passenger_count * 65.0;
}



void setup()
{
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("Smart Bus Safe Speed Prediction System");
  Serial.println("ESP32 Firmware v2.0");
  Serial.println("========================================");

  // Initialize OLED
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

  // If no WiFi saved → AP MODE
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
      Serial.println("\n WiFi Connected!");
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
      Serial.println("\n WiFi Connection Failed!");
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

// MAIN LOOP

void loop()
{
  server.handleClient();

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
