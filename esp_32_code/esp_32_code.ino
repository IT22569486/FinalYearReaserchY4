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
