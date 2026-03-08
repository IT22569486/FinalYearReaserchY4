/*
SMART BUS SYSTEM
ESP32 Firmware v7 - MQTT Version
Components:
  ESP32
  GPS NEO6M
  HX711 Load Cell
  2 IR Sensors
  ILI9341 TFT Display

Changes from v6:
  - Replaced HTTP with MQTT communication
  - Added configuration web server for bus_ID and route_ID
  - Added Preferences storage for persistent configuration
  - Added MQTT topics: bus/{bus_ID}/gps and bus/{bus_ID}/passenger
*/

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HX711.h>

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

//////////////////////////////////////
// WIFI CONFIGURATION
//////////////////////////////////////

const char* ssid = "SLT-4G_BD8DB";
const char* password = "prolink12345";

//////////////////////////////////////
// MQTT CONFIGURATION
//////////////////////////////////////

const char* MQTT_SERVER = "192.168.1.24";
const int MQTT_PORT = 1883;
const char* MQTT_USER = "";        // Leave empty if no auth
const char* MQTT_PASSWORD = "";    // Leave empty if no auth

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

//////////////////////////////////////
// CONFIGURATION WEB SERVER
//////////////////////////////////////

WebServer configServer(80);
Preferences preferences;

String bus_ID = "";
int route_ID = 0;
bool configMode = false;

//////////////////////////////////////
// GPS
//////////////////////////////////////

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

float latitude = 0;
float longitude = 0;
float speedKmh = 0;

//////////////////////////////////////
// LOAD CELL
//////////////////////////////////////

#define HX_DOUT 32
#define HX_SCK 33

HX711 scale;
float busWeight = 0;

//////////////////////////////////////
// IR PASSENGER SENSORS
//////////////////////////////////////

#define IR1 34
#define IR2 35

int passengerCount = 0;
int passengerIn = 0;
int passengerOut = 0;

unsigned long lastTriggerTime = 0;
const int freezeTime = 2000;
bool sensorsLocked = false;

//////////////////////////////////////
// TFT DISPLAY
//////////////////////////////////////

#define TFT_CS 5
#define TFT_DC 2
#define TFT_RST 4

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

//////////////////////////////////////
// SYSTEM VARIABLES
//////////////////////////////////////

float safeSpeed = 40;
String location_name = "Unknown";

bool busMoving = false;

unsigned long lastSend = 0;
unsigned long lastDisplay = 0;
unsigned long lastMqttReconnect = 0;

//////////////////////////////////////////////////////////
// WIFI CONNECT
//////////////////////////////////////////////////////////

void connectWiFi() {
  Serial.println("Connecting WiFi");
  tft.fillScreen(ILI9341_BLACK);
  tft.setCursor(10, 50);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(2);
  tft.println("Connecting WiFi...");

  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected");
    Serial.println(WiFi.localIP());
    
    tft.fillScreen(ILI9341_BLACK);
    tft.setCursor(10, 50);
    tft.setTextColor(ILI9341_GREEN);
    tft.println("WiFi Connected!");
    tft.setCursor(10, 80);
    tft.print("IP: ");
    tft.println(WiFi.localIP());
    delay(2000);
  } else {
    Serial.println("\nWiFi Failed - Starting AP Mode");
    startConfigAP();
  }
}

//////////////////////////////////////////////////////////
// CONFIGURATION ACCESS POINT MODE
//////////////////////////////////////////////////////////

void startConfigAP() {
  configMode = true;
  WiFi.softAP("SmartBus_Config", "smartbus123");
  
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
  
  tft.fillScreen(ILI9341_BLACK);
  tft.setCursor(10, 30);
  tft.setTextColor(ILI9341_YELLOW);
  tft.setTextSize(2);
  tft.println("CONFIG MODE");
  tft.setCursor(10, 60);
  tft.setTextColor(ILI9341_WHITE);
  tft.println("Connect to WiFi:");
  tft.setCursor(10, 90);
  tft.setTextColor(ILI9341_CYAN);
  tft.println("SmartBus_Config");
  tft.setCursor(10, 120);
  tft.setTextColor(ILI9341_WHITE);
  tft.println("Password:");
  tft.setCursor(10, 150);
  tft.setTextColor(ILI9341_CYAN);
  tft.println("smartbus123");
  tft.setCursor(10, 190);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("Go to: ");
  tft.println(IP);
  
  setupConfigServer();
}

//////////////////////////////////////////////////////////
// CONFIGURATION WEB SERVER
//////////////////////////////////////////////////////////

void setupConfigServer() {
  // Root page - Configuration form
  configServer.on("/", HTTP_GET, handleConfigPage);
  
  // Save configuration
  configServer.on("/save", HTTP_POST, handleSaveConfig);
  
  // Get current configuration
  configServer.on("/status", HTTP_GET, handleStatus);
  
  configServer.begin();
  Serial.println("Config server started");
}

void handleConfigPage() {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Smart Bus Configuration</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 400px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    }
    h1 {
      color: #1e3c72;
      text-align: center;
      margin-bottom: 30px;
    }
    .bus-icon {
      text-align: center;
      font-size: 48px;
      margin-bottom: 20px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #333;
      font-weight: bold;
    }
    input[type="text"], input[type="number"] {
      width: 100%;
      padding: 12px;
      margin-bottom: 20px;
      border: 2px solid #ddd;
      border-radius: 8px;
      box-sizing: border-box;
      font-size: 16px;
    }
    input:focus {
      border-color: #2a5298;
      outline: none;
    }
    button {
      width: 100%;
      padding: 15px;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:hover {
      transform: scale(1.02);
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      background: #f0f0f0;
      border-radius: 8px;
      text-align: center;
    }
    .success {
      background: #d4edda;
      color: #155724;
    }
    .info {
      background: #e7f3ff;
      color: #0066cc;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="bus-icon">🚌</div>
    <h1>Smart Bus Config</h1>
    
    <div class="info">
      Configure the Bus ID and Route ID for this device. These values will be stored permanently.
    </div>
    
    <form action="/save" method="POST">
      <label for="bus_id">Bus ID:</label>
      <input type="text" id="bus_id" name="bus_id" placeholder="e.g., BUS-001" value=")rawliteral" + bus_ID + R"rawliteral(" required>
      
      <label for="route_id">Route ID:</label>
      <input type="number" id="route_id" name="route_id" placeholder="e.g., 101" value=")rawliteral" + String(route_ID) + R"rawliteral(" required>
      
      <button type="submit">Save Configuration</button>
    </form>
    
    <div class="status" id="status">
      Current: Bus ID = )rawliteral" + bus_ID + R"rawliteral(, Route ID = )rawliteral" + String(route_ID) + R"rawliteral(
    </div>
  </div>
</body>
</html>
)rawliteral";
  
  configServer.send(200, "text/html", html);
}

void handleSaveConfig() {
  if (configServer.hasArg("bus_id") && configServer.hasArg("route_id")) {
    bus_ID = configServer.arg("bus_id");
    route_ID = configServer.arg("route_id").toInt();
    
    // Save to persistent storage
    preferences.begin("busconfig", false);
    preferences.putString("bus_id", bus_ID);
    preferences.putInt("route_id", route_ID);
    preferences.end();
    
    Serial.println("Configuration saved:");
    Serial.println("Bus ID: " + bus_ID);
    Serial.println("Route ID: " + String(route_ID));
    
    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <title>Configuration Saved</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: Arial, sans-serif;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 400px;
      background: white;
      padding: 40px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      text-align: center;
    }
    .success-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 { color: #28a745; }
    p { color: #666; font-size: 16px; }
    .config-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    a {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 30px;
      background: #1e3c72;
      color: white;
      text-decoration: none;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>Saved!</h1>
    <div class="config-info">
      <p><strong>Bus ID:</strong> )rawliteral" + bus_ID + R"rawliteral(</p>
      <p><strong>Route ID:</strong> )rawliteral" + String(route_ID) + R"rawliteral(</p>
    </div>
    <p>The device will restart and connect to the main WiFi network.</p>
    <a href="/">Back to Config</a>
  </div>
</body>
</html>
)rawliteral";
    
    configServer.send(200, "text/html", html);
    
    // Restart after saving to apply new config
    delay(2000);
    ESP.restart();
  } else {
    configServer.send(400, "text/plain", "Missing parameters");
  }
}

void handleStatus() {
  StaticJsonDocument<256> doc;
  doc["bus_id"] = bus_ID;
  doc["route_id"] = route_ID;
  doc["wifi_connected"] = WiFi.status() == WL_CONNECTED;
  doc["mqtt_connected"] = mqttClient.connected();
  doc["ip"] = WiFi.localIP().toString();
  
  String response;
  serializeJson(doc, response);
  configServer.send(200, "application/json", response);
}

//////////////////////////////////////////////////////////
// LOAD SAVED CONFIGURATION
//////////////////////////////////////////////////////////

void loadConfig() {
  preferences.begin("busconfig", true);
  bus_ID = preferences.getString("bus_id", "");
  route_ID = preferences.getInt("route_id", 0);
  preferences.end();
  
  Serial.println("Loaded configuration:");
  Serial.println("Bus ID: " + bus_ID);
  Serial.println("Route ID: " + String(route_ID));
}

//////////////////////////////////////////////////////////
// MQTT CONNECTION
//////////////////////////////////////////////////////////

void connectMQTT() {
  if (!mqttClient.connected() && millis() - lastMqttReconnect > 5000) {
    lastMqttReconnect = millis();
    
    Serial.println("Connecting to MQTT...");
    
    String clientId = "ESP32_Bus_" + bus_ID;
    
    bool connected = false;
    if (strlen(MQTT_USER) > 0) {
      connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD);
    } else {
      connected = mqttClient.connect(clientId.c_str());
    }
    
    if (connected) {
      Serial.println("MQTT Connected!");
      
      // Subscribe to commands topic (optional - for receiving safe speed updates)
      String cmdTopic = "bus/" + bus_ID + "/commands";
      mqttClient.subscribe(cmdTopic.c_str());
      
    } else {
      Serial.print("MQTT Connection failed, rc=");
      Serial.println(mqttClient.state());
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("MQTT Message received:");
  Serial.println("Topic: " + String(topic));
  Serial.println("Payload: " + message);
  
  // Parse command (e.g., safe speed update)
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (!error) {
    if (doc.containsKey("safe_speed")) {
      safeSpeed = doc["safe_speed"];
      Serial.println("Safe speed updated: " + String(safeSpeed));
    }
    if (doc.containsKey("location_name")) {
      location_name = doc["location_name"].as<String>();
      Serial.println("Location: " + location_name);
    }
  }
}

//////////////////////////////////////////////////////////
// GPS READ
//////////////////////////////////////////////////////////

void readGPS() {
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  if (gps.location.isUpdated()) {
    latitude = gps.location.lat();
    longitude = gps.location.lng();
  }

  if (gps.speed.isUpdated()) {
    speedKmh = gps.speed.kmph();
  }

  Serial.print("Satellites: ");
  Serial.println(gps.satellites.value());
}

//////////////////////////////////////////////////////////
// PASSENGER COUNTING
//////////////////////////////////////////////////////////

void passengerCounter() {
  bool sensor1 = digitalRead(IR1) == LOW;
  bool sensor2 = digitalRead(IR2) == LOW;

  if (millis() - lastTriggerTime < freezeTime) {
    return;
  }

  if (sensorsLocked) {
    if (!sensor1 && !sensor2) {
      sensorsLocked = false;
    }
    return;
  }

  if (sensor1) {
    passengerCount++;
    passengerIn++;

    Serial.println("IR1 Triggered → Passenger IN");

    sensorsLocked = true;
    lastTriggerTime = millis();
  }

  else if (sensor2) {
    passengerCount--;
    passengerOut++;

    Serial.println("IR2 Triggered → Passenger OUT");

    sensorsLocked = true;
    lastTriggerTime = millis();
  }

  if (passengerCount < 0)
    passengerCount = 0;
}

//////////////////////////////////////////////////////////
// LOAD CELL
//////////////////////////////////////////////////////////

void readWeight() {
  if (scale.is_ready()) {
    busWeight = scale.get_units(10);
  }
}

//////////////////////////////////////////////////////////
// DISPLAY UPDATE
//////////////////////////////////////////////////////////

void updateDisplay() {
  tft.fillScreen(ILI9341_BLACK);

  tft.setTextSize(2);
  tft.setTextColor(ILI9341_GREEN);

  tft.setCursor(60, 10);
  tft.println("SMART BUS");
  
  // Bus ID
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(10, 35);
  tft.print("ID: ");
  tft.print(bus_ID);
  tft.print(" R:");
  tft.println(route_ID);

  tft.setTextColor(ILI9341_WHITE);

  // Speed
  tft.setCursor(10, 60);
  tft.print("Speed: ");
  if (speedKmh > safeSpeed) {
    tft.setTextColor(ILI9341_RED);
  } else {
    tft.setTextColor(ILI9341_GREEN);
  }
  tft.print(speedKmh, 1);
  tft.print("/");
  tft.print(safeSpeed, 0);
  tft.println(" km/h");
  
  tft.setTextColor(ILI9341_WHITE);

  // Passenger total
  tft.setCursor(10, 90);
  tft.print("Passengers: ");
  tft.println(passengerCount);

  // Passenger IN
  tft.setCursor(10, 115);
  tft.print("IN: ");
  tft.print(passengerIn);
  tft.print("  OUT: ");
  tft.println(passengerOut);

  // TOTAL WEIGHT
  tft.setCursor(10, 140);
  tft.print("Weight: ");
  tft.print(busWeight, 1);
  tft.println(" kg");

  // GPS
  tft.setCursor(10, 170);
  tft.setTextSize(1);
  tft.print("GPS: ");
  tft.print(latitude, 6);
  tft.print(", ");
  tft.println(longitude, 6);
  
  // MQTT Status
  tft.setCursor(10, 185);
  tft.print("MQTT: ");
  if (mqttClient.connected()) {
    tft.setTextColor(ILI9341_GREEN);
    tft.println("Connected");
  } else {
    tft.setTextColor(ILI9341_RED);
    tft.println("Disconnected");
  }
  
  // Location name
  tft.setTextColor(ILI9341_YELLOW);
  tft.setCursor(10, 200);
  tft.print("Loc: ");
  tft.println(location_name);
}

//////////////////////////////////////////////////////////
// PUBLISH GPS DATA VIA MQTT
//////////////////////////////////////////////////////////

void publishGPSData() {
  if (!mqttClient.connected()) return;
  if (bus_ID.length() == 0) return;

  StaticJsonDocument<256> doc;

  doc["bus_id"] = bus_ID;
  doc["route_id"] = route_ID;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["speed"] = speedKmh;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  String topic = "bus/" + bus_ID + "/gps";
  
  if (mqttClient.publish(topic.c_str(), payload.c_str())) {
    Serial.println("GPS data published to: " + topic);
  } else {
    Serial.println("GPS publish failed!");
  }
}

//////////////////////////////////////////////////////////
// PUBLISH PASSENGER DATA VIA MQTT
//////////////////////////////////////////////////////////

void publishPassengerData() {
  if (!mqttClient.connected()) return;
  if (bus_ID.length() == 0) return;

  StaticJsonDocument<512> doc;

  doc["bus_id"] = bus_ID;
  doc["route_id"] = route_ID;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["total_weight"] = busWeight;
  doc["in_count"] = passengerIn;
  doc["out_count"] = passengerOut;
  doc["total_passenger_count"] = passengerCount;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  String topic = "bus/" + bus_ID + "/passenger";
  
  if (mqttClient.publish(topic.c_str(), payload.c_str())) {
    Serial.println("Passenger data published to: " + topic);
  } else {
    Serial.println("Passenger publish failed!");
  }

  // Reset counters after publishing
  passengerIn = 0;
  passengerOut = 0;
}

//////////////////////////////////////////////////////////
// SETUP
//////////////////////////////////////////////////////////

void setup() {
  Serial.begin(115200);

  pinMode(IR1, INPUT);
  pinMode(IR2, INPUT);

  // Initialize TFT first for status display
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 100);
  tft.println("Smart Bus v7");
  tft.setCursor(20, 130);
  tft.println("Initializing...");
  delay(1000);

  // Load saved configuration
  loadConfig();

  // Check if configuration is valid
  if (bus_ID.length() == 0) {
    Serial.println("No configuration found - starting config mode");
    startConfigAP();
  } else {
    // Connect to WiFi
    connectWiFi();
    
    // If WiFi connected, setup normal mode
    if (WiFi.status() == WL_CONNECTED && !configMode) {
      // Setup MQTT
      mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
      mqttClient.setCallback(mqttCallback);
      
      // Start config server on normal mode too (for reconfiguration)
      setupConfigServer();
    }
  }

  // Initialize GPS
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  // Initialize Load Cell
  scale.begin(HX_DOUT, HX_SCK);
  scale.set_scale(2280.f);
  scale.tare();

  Serial.println("Setup complete!");
}

//////////////////////////////////////////////////////////
// LOOP
//////////////////////////////////////////////////////////

void loop() {
  // Handle config server requests
  configServer.handleClient();
  
  // If in config mode, only handle web server
  if (configMode) {
    delay(10);
    return;
  }

  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  // Read GPS
  readGPS();

  // Bus stopped (speed < 2 km/h)
  if (speedKmh < 2) {
    passengerCounter();
    readWeight();

    if (busMoving) {
      // Just stopped - send passenger data
      publishPassengerData();
      busMoving = false;
    }
  } else {
    // Bus moving
    busMoving = true;

    // Publish GPS data every 2 seconds
    if (millis() - lastSend > 2000) {
      publishGPSData();
      lastSend = millis();
    }
  }

  // Update display every second
  if (millis() - lastDisplay > 1000) {
    updateDisplay();
    lastDisplay = millis();
  }

  Serial.println("Loop running...");
}
