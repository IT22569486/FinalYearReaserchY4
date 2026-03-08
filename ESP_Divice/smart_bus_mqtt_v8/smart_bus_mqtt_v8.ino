/*
  SMART BUS SYSTEM
  ESP32 Firmware v8
  MQTT Based Communication with Bus ID
  
  Topics:
  - Publishes: bus/{BUS_ID}/telemetry (GPS, speed, passengers, weight)
  - Subscribes: bus/{BUS_ID}/safe-speed (receives safe speed predictions)
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HX711.h>
#include <Preferences.h>
#include <WebServer.h>

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

//////////////////////////////////////
// CONFIGURATION (Edit these)
//////////////////////////////////////

// WiFi Settings
const char* ssid = "SLT-4G_BD8DB";
const char* password = "prolink12345";

// MQTT Broker IP (your PC running the Node.js backend)
const char* mqtt_server = "192.168.1.14";
const int mqtt_port = 1883;

// Bus Configuration (stored in flash)
Preferences preferences;
String BUS_ID = "BUS001";
String ROUTE_ID = "ROUTE001";

//////////////////////////////////////
// MQTT
//////////////////////////////////////

WiFiClient espClient;
PubSubClient client(espClient);

// Dynamic topics (built with BUS_ID)
String TELEMETRY_TOPIC;
String SAFE_SPEED_TOPIC;

//////////////////////////////////////
// GPS
//////////////////////////////////////

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

float latitude = 0;
float longitude = 0;
float speedKmh = 0;
bool gpsValid = false;

//////////////////////////////////////
// LOAD CELL
//////////////////////////////////////

#define HX_DOUT 32
#define HX_SCK 33

HX711 scale;
float busWeight = 0;
float calibrationFactor = 2280.0;

//////////////////////////////////////
// IR PASSENGER SENSORS
//////////////////////////////////////

#define IR1 34
#define IR2 35

int passengerCount = 0;
int passengerIn = 0;
int passengerOut = 0;
int sessionIn = 0;   // Per-stop counter
int sessionOut = 0;  // Per-stop counter

unsigned long lastTriggerTime = 0;
const int freezeTime = 2000;
bool sensorsLocked = false;
bool passengerChanged = false;

//////////////////////////////////////
// TFT DISPLAY
//////////////////////////////////////

#define TFT_CS 5
#define TFT_DC 2
#define TFT_RST 4

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

//////////////////////////////////////
// SAFE SPEED (from server)
//////////////////////////////////////

float safeSpeed = 40;
String locationName = "Unknown";
bool isOverSpeed = false;

//////////////////////////////////////
// TIMING
//////////////////////////////////////

unsigned long lastTelemetrySend = 0;
unsigned long lastPassengerSend = 0;
unsigned long lastDisplayUpdate = 0;

const int TELEMETRY_INTERVAL = 2000;    // Send GPS every 2 seconds
const int PASSENGER_INTERVAL = 5000;    // Send passenger data every 5 seconds when stopped
const int DISPLAY_INTERVAL = 1000;      // Update display every second

//////////////////////////////////////
// CONFIG WEB SERVER
//////////////////////////////////////

WebServer webServer(80);
bool configMode = false;

//////////////////////////////////////
// FUNCTIONS
//////////////////////////////////////

void loadConfig() {
  preferences.begin("busconfig", true);  // Read-only
  BUS_ID = preferences.getString("bus_id", "BUS001");
  ROUTE_ID = preferences.getString("route_id", "ROUTE001");
  calibrationFactor = preferences.getFloat("cal_factor", 2280.0);
  preferences.end();
  
  // Build MQTT topics
  TELEMETRY_TOPIC = "bus/" + BUS_ID + "/telemetry";
  SAFE_SPEED_TOPIC = "bus/" + BUS_ID + "/safe-speed";
  
  Serial.println("Config loaded:");
  Serial.println("  Bus ID: " + BUS_ID);
  Serial.println("  Route ID: " + ROUTE_ID);
  Serial.println("  Telemetry Topic: " + TELEMETRY_TOPIC);
}

void saveConfig(String busId, String routeId, float calFactor) {
  preferences.begin("busconfig", false);  // Read-write
  preferences.putString("bus_id", busId);
  preferences.putString("route_id", routeId);
  preferences.putFloat("cal_factor", calFactor);
  preferences.end();
  
  BUS_ID = busId;
  ROUTE_ID = routeId;
  calibrationFactor = calFactor;
  
  // Rebuild topics
  TELEMETRY_TOPIC = "bus/" + BUS_ID + "/telemetry";
  SAFE_SPEED_TOPIC = "bus/" + BUS_ID + "/safe-speed";
}

//////////////////////////////////////
// WIFI CONNECT
//////////////////////////////////////

void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  tft.fillScreen(ILI9341_BLACK);
  tft.setCursor(20, 100);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.print("Connecting WiFi...");

  WiFi.begin(ssid, password);
  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    
    tft.fillScreen(ILI9341_BLACK);
    tft.setCursor(20, 100);
    tft.setTextColor(ILI9341_GREEN);
    tft.print("WiFi OK: ");
    tft.print(WiFi.localIP());
    delay(1500);
  } else {
    Serial.println("\nWiFi Failed!");
    tft.setTextColor(ILI9341_RED);
    tft.print("WiFi FAILED");
  }
}

//////////////////////////////////////
// MQTT CONNECT
//////////////////////////////////////

void connectMQTT() {
  int attempts = 0;
  
  while (!client.connected() && attempts < 3) {
    Serial.print("Connecting MQTT...");
    
    String clientId = "ESP32_" + BUS_ID;

    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      
      // Subscribe to safe speed topic
      client.subscribe(SAFE_SPEED_TOPIC.c_str());
      Serial.println("Subscribed to: " + SAFE_SPEED_TOPIC);
      
    } else {
      Serial.print("failed, rc=");
      Serial.println(client.state());
      attempts++;
      delay(2000);
    }
  }
}

//////////////////////////////////////
// MQTT CALLBACK (Receive Safe Speed)
//////////////////////////////////////

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("MQTT Received: " + message);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("JSON parse failed");
    return;
  }

  // Update safe speed from prediction server
  if (doc.containsKey("safe_speed")) {
    safeSpeed = doc["safe_speed"];
  }
  if (doc.containsKey("location_name")) {
    locationName = doc["location_name"].as<String>();
  }
  if (doc.containsKey("is_school_zone")) {
    // Handle school zone warning
  }
  
  // Check overspeed
  isOverSpeed = (speedKmh > safeSpeed);
}

//////////////////////////////////////
// GPS READING
//////////////////////////////////////

void readGPS() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isValid()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
    gpsValid = true;
  }

  if (gps.speed.isValid()) {
    speedKmh = gps.speed.kmph();
  }
}

//////////////////////////////////////
// PASSENGER COUNTING
//////////////////////////////////////

void passengerCounter() {
  bool sensor1 = digitalRead(IR1) == LOW;  // Entry sensor
  bool sensor2 = digitalRead(IR2) == LOW;  // Exit sensor

  if (millis() - lastTriggerTime < freezeTime) return;

  if (sensorsLocked) {
    if (!sensor1 && !sensor2) sensorsLocked = false;
    return;
  }

  if (sensor1) {
    // Passenger boarding
    passengerCount++;
    passengerIn++;
    sessionIn++;
    passengerChanged = true;
    sensorsLocked = true;
    lastTriggerTime = millis();
    Serial.println("Passenger IN: " + String(passengerCount));
  }
  else if (sensor2) {
    // Passenger alighting
    if (passengerCount > 0) passengerCount--;
    passengerOut++;
    sessionOut++;
    passengerChanged = true;
    sensorsLocked = true;
    lastTriggerTime = millis();
    Serial.println("Passenger OUT: " + String(passengerCount));
  }
}

//////////////////////////////////////
// WEIGHT READING
//////////////////////////////////////

void readWeight() {
  if (scale.is_ready()) {
    busWeight = scale.get_units(5);
    if (busWeight < 0) busWeight = 0;
  }
}

//////////////////////////////////////
// DISPLAY UPDATE
//////////////////////////////////////

void updateDisplay() {
  tft.fillScreen(ILI9341_BLACK);

  // Header
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(10, 5);
  tft.print("Smart Bus - ");
  tft.print(BUS_ID);

  // Status line
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(10, 28);
  tft.print("Route: ");
  tft.print(ROUTE_ID);
  tft.print(" | GPS: ");
  tft.print(gpsValid ? "OK" : "NO");
  tft.print(" | MQTT: ");
  tft.print(client.connected() ? "OK" : "NO");

  // Divider
  tft.drawLine(0, 40, 320, 40, ILI9341_DARKGREY);

  // Speed Section
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 50);
  tft.print("Speed:");
  
  tft.setTextSize(3);
  if (isOverSpeed) {
    tft.setTextColor(ILI9341_RED);
  } else {
    tft.setTextColor(ILI9341_GREEN);
  }
  tft.setCursor(20, 75);
  tft.print(speedKmh, 1);
  tft.print(" km/h");

  // Safe Speed
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(180, 50);
  tft.print("Safe:");
  
  tft.setTextSize(3);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setCursor(180, 75);
  tft.print(safeSpeed, 0);
  tft.print(" km/h");

  // Divider
  tft.drawLine(0, 115, 320, 115, ILI9341_DARKGREY);

  // Location
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 125);
  tft.print("Location: ");
  tft.setTextColor(ILI9341_YELLOW);
  tft.print(locationName);

  // Passenger Section
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 155);
  tft.print("Passengers: ");
  tft.setTextColor(ILI9341_CYAN);
  tft.print(passengerCount);
  
  tft.setTextColor(ILI9341_GREEN);
  tft.print(" +");
  tft.print(passengerIn);
  
  tft.setTextColor(ILI9341_RED);
  tft.print(" -");
  tft.print(passengerOut);

  // Weight
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 180);
  tft.print("Weight: ");
  tft.setTextColor(ILI9341_MAGENTA);
  tft.print(busWeight, 1);
  tft.print(" kg");

  // GPS Coordinates
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_DARKGREY);
  tft.setCursor(20, 210);
  tft.print("GPS: ");
  tft.print(latitude, 6);
  tft.print(", ");
  tft.print(longitude, 6);
}

//////////////////////////////////////
// SEND TELEMETRY (GPS + Speed)
//////////////////////////////////////

void sendTelemetry() {
  if (!client.connected()) {
    connectMQTT();
    if (!client.connected()) return;
  }

  StaticJsonDocument<512> doc;

  doc["bus_id"] = BUS_ID;
  doc["route_id"] = ROUTE_ID;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["speed"] = speedKmh;
  doc["passenger_count"] = passengerCount;
  doc["total_weight"] = busWeight;
  doc["gps_valid"] = gpsValid;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  client.publish(TELEMETRY_TOPIC.c_str(), payload.c_str());
  Serial.println("Telemetry: " + payload);
}

//////////////////////////////////////
// CONFIG WEB PAGE
//////////////////////////////////////

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;padding:20px;max-width:400px;margin:auto;}";
  html += "input,button{width:100%;padding:12px;margin:8px 0;box-sizing:border-box;}";
  html += "button{background:#4CAF50;color:white;border:none;cursor:pointer;}";
  html += ".info{background:#e7f3ff;padding:10px;border-radius:5px;margin-bottom:20px;}</style>";
  html += "</head><body>";
  html += "<h2>Smart Bus Config</h2>";
  html += "<div class='info'>";
  html += "<b>Current Config:</b><br>";
  html += "Bus ID: " + BUS_ID + "<br>";
  html += "Route ID: " + ROUTE_ID + "<br>";
  html += "IP: " + WiFi.localIP().toString() + "<br>";
  html += "MQTT: " + String(mqtt_server) + "</div>";
  html += "<form action='/save' method='POST'>";
  html += "<label>Bus ID:</label>";
  html += "<input type='text' name='bus_id' value='" + BUS_ID + "' required>";
  html += "<label>Route ID:</label>";
  html += "<input type='text' name='route_id' value='" + ROUTE_ID + "' required>";
  html += "<label>Scale Calibration:</label>";
  html += "<input type='number' step='0.1' name='cal_factor' value='" + String(calibrationFactor) + "'>";
  html += "<button type='submit'>Save & Restart</button>";
  html += "</form>";
  html += "<br><a href='/status'>View Status JSON</a>";
  html += "</body></html>";
  
  webServer.send(200, "text/html", html);
}

void handleSave() {
  if (webServer.hasArg("bus_id") && webServer.hasArg("route_id")) {
    String newBusId = webServer.arg("bus_id");
    String newRouteId = webServer.arg("route_id");
    float newCalFactor = webServer.arg("cal_factor").toFloat();
    
    if (newCalFactor < 1) newCalFactor = 2280.0;
    
    saveConfig(newBusId, newRouteId, newCalFactor);
    
    webServer.send(200, "text/html", 
      "<html><body><h2>Saved!</h2><p>Restarting in 3 seconds...</p></body></html>");
    delay(3000);
    ESP.restart();
  } else {
    webServer.send(400, "text/html", "Missing parameters");
  }
}

void handleStatus() {
  StaticJsonDocument<512> doc;
  doc["bus_id"] = BUS_ID;
  doc["route_id"] = ROUTE_ID;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["speed"] = speedKmh;
  doc["safe_speed"] = safeSpeed;
  doc["passenger_count"] = passengerCount;
  doc["passenger_in"] = passengerIn;
  doc["passenger_out"] = passengerOut;
  doc["weight"] = busWeight;
  doc["gps_valid"] = gpsValid;
  doc["mqtt_connected"] = client.connected();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_ms"] = millis();
  
  String json;
  serializeJson(doc, json);
  webServer.send(200, "application/json", json);
}

void setupWebServer() {
  webServer.on("/", handleRoot);
  webServer.on("/save", HTTP_POST, handleSave);
  webServer.on("/status", handleStatus);
  webServer.begin();
  Serial.println("Web server started at http://" + WiFi.localIP().toString());
}

//////////////////////////////////////
// SETUP
//////////////////////////////////////

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nSmart Bus System v8 Starting...");

  // Load config from flash
  loadConfig();

  // Initialize pins
  pinMode(IR1, INPUT);
  pinMode(IR2, INPUT);

  // Initialize GPS
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  // Initialize Scale
  scale.begin(HX_DOUT, HX_SCK);
  scale.set_scale(calibrationFactor);
  scale.tare();

  // Initialize Display
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 100);
  tft.print("Smart Bus v8");
  tft.setCursor(20, 130);
  tft.print("Bus: " + BUS_ID);
  delay(1500);

  // Connect WiFi
  connectWiFi();

  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(512);

  // Setup Web Server for config
  setupWebServer();

  // Initial MQTT connection
  connectMQTT();

  Serial.println("Setup complete!");
}

//////////////////////////////////////
// MAIN LOOP
//////////////////////////////////////

void loop() {
  // Handle web server requests
  webServer.handleClient();

  // Maintain MQTT connection
  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();

  // Read sensors
  readGPS();
  passengerCounter();
  readWeight();

  // Check overspeed
  isOverSpeed = (speedKmh > safeSpeed);

  // Send telemetry periodically
  if (millis() - lastTelemetrySend > TELEMETRY_INTERVAL) {
    sendTelemetry();
    lastTelemetrySend = millis();
  }

  // Update display
  if (millis() - lastDisplayUpdate > DISPLAY_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = millis();
  }
}
