/*
  SMART BUS SYSTEM - TEST SIMULATOR
  ESP32 Firmware v8 Test
  MQTT Based Communication with Bus ID
  
  Uses hardcoded route stop data instead of real sensors.
  Simulates bus moving between stops and stopping at bus stops.
  
  Topics:
  - Publishes: bus/{BUS_ID}/telemetry (GPS, speed, passengers, weight)
  - Publishes: bus/{BUS_ID}/stop-data (when bus leaves a stop)
  - Subscribes: bus/{BUS_ID}/safe-speed (receives safe speed predictions)
  - Subscribes: bus/{BUS_ID}/context-aware (receives road monitoring predictions)
  - Subscribes: bus/{BUS_ID}/driver-monitor (receives driver monitoring predictions)
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <WebServer.h>

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

//////////////////////////////////////
// CONFIGURATION
//////////////////////////////////////

const char* ssid = "SLT-4G_BD8DB";
const char* password = "prolink12345";

const char* mqtt_server = "192.168.1.14";
const int mqtt_port = 1883;

Preferences preferences;
String BUS_ID = "NA-225566";
String ROUTE_ID = "177_Kaduwela_Kollupitiya";

//////////////////////////////////////
// MQTT
//////////////////////////////////////

WiFiClient espClient;
PubSubClient client(espClient);

String TELEMETRY_TOPIC;
String SAFE_SPEED_TOPIC;
String STOP_DATA_TOPIC;
String CONTEXT_AWARE_TOPIC;
String DRIVER_MONITOR_TOPIC;

//////////////////////////////////////
// ROUTE STOPS - Test Data (Route 177)
//////////////////////////////////////

struct RouteStop {
  const char* name;
  float lat;
  float lon;
};

const RouteStop ROUTE_STOPS[] = {
  {"Kaduwela",            6.936372, 79.983250},
  {"Kaduwela Town",       6.935330, 79.983979},
  {"Kothalawala Temple",  6.932240, 79.982483},
  {"Kothalawala School",  6.930064, 79.982485},
  {"Pattiyawatte",        6.926966, 79.980181},
  {"Kothalawala Kaduwela",6.925070, 79.978623},
  {"Vihara Mawatha",      6.921323, 79.975053},
  {"Seewalee Mawatha",    6.920005, 79.974249},
  {"Gemunupura",          6.917404, 79.973674},
  {"Weliwita Junction",   6.916075, 79.972486},
  {"SLIIT Campus Malabe", 6.914507, 79.972217},
  {"Sudarshana Mawatha",  6.908750, 79.966200},
  {"Cinec Campus Rd",     6.905667, 79.963062},
  {"Godalla Watte Rd",    6.904424, 79.961022},
  {"Malabe School",       6.903885, 79.956062},
  {"Millagahawatta Rd",   6.904965, 79.949977},
  {"Dambugahawatta Rd",   6.906235, 79.947431},
  {"Thalahena Junction",  6.907849, 79.945173},
  {"Laktharu Mawatha",    6.908440, 79.941397},
  {"8th Post",            6.908386, 79.939897},
  {"Kotte-Bope Road",     6.908454, 79.938440},
  {"Sri Subodhi School",  6.908385, 79.936670},
  {"Koswatta",            6.908008, 79.929277},
  {"Koswaththa Depot",    6.905958, 79.926292},
  {"Ganahena",            6.904294, 79.923976},
  {"Kanatta Road",        6.902769, 79.920275},
  {"Battaramulla",        6.902235, 79.918084},
  {"Sathsiripaya",        6.902256, 79.915839},
  {"Parliament Junction", 6.903192, 79.911686},
  {"Ethulkotte",          6.903290, 79.907572},
  {"HSBC Rajagiriya",     6.906667, 79.902067},
  {"Rajagiriya",          6.907728, 79.899831},
  {"Rajagiriya Bus Stop", 6.910234, 79.894342},
  {"Golden Key Hospital", 6.910882, 79.889240},
  {"Castle Street",       6.911047, 79.884967},
  {"House Of Fashion",    6.911394, 79.876836},
  {"Horton Gardens",      6.911436, 79.873332},
  {"Public Library",      6.912843, 79.858042},
  {"Kollupitiya SM",      6.912076, 79.850754},
  {"Kollupitiya",         6.911120, 79.849171},
};

const int TOTAL_STOPS = sizeof(ROUTE_STOPS) / sizeof(ROUTE_STOPS[0]);

//////////////////////////////////////
// SIMULATED SENSOR DATA
//////////////////////////////////////

float latitude = 0;
float longitude = 0;
float speedKmh = 0;
bool gpsValid = true;

float busWeight = 0;
int passengerCount = 5;
int passengerIn = 0;
int passengerOut = 0;
int sessionIn = 0;
int sessionOut = 0;

// Simulation state
int currentStopIndex = 0;
bool goingForward = true;
bool busIsStopped = false;
float stopLatitude = 0;
float stopLongitude = 0;
unsigned long stopStartTime = 0;
unsigned long stopDuration = 0;

// Which stops the bus will stop at (every 3rd stop)
int stopCounter = 0;

//////////////////////////////////////
// TFT DISPLAY
//////////////////////////////////////

#define TFT_CS 5
#define TFT_DC 2
#define TFT_RST 4

Adafruit_ILI9341 tft = Adafruit_ILI9341(TFT_CS, TFT_DC, TFT_RST);

//////////////////////////////////////
// SAFE SPEED (from prediction server)
//////////////////////////////////////

float safeSpeed = 40;
String locationName = "Unknown";
bool isOverSpeed = false;

//////////////////////////////////////
// CONTEXT-AWARE PREDICTIONS (from Pi)
//////////////////////////////////////

String camWarning = "CLEAR";
String camProximity = "Clear";
bool camLaneWarning = false;
bool camWrongSide = false;

//////////////////////////////////////
// DRIVER MONITOR PREDICTIONS (from Pi)
//////////////////////////////////////

String dmsState = "INIT";
String dmsSeverity = "info";
bool dmsPhone = false;
bool dmsSeatbelt = true;

//////////////////////////////////////
// TIMING
//////////////////////////////////////

unsigned long lastTelemetrySend = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastStopAdvance = 0;

const int TELEMETRY_INTERVAL = 2000;
const int DISPLAY_INTERVAL = 1000;
const int MOVE_INTERVAL = 5000;       // Move to next stop every 5 seconds
const int STOP_WAIT_TIME = 8000;      // Stay at bus stop for 8 seconds

//////////////////////////////////////
// CONFIG WEB SERVER
//////////////////////////////////////

WebServer webServer(80);

//////////////////////////////////////
// FUNCTIONS
//////////////////////////////////////

void loadConfig() {
  // Force correct BUS_ID for test simulator (overwrite any old value in flash)
  BUS_ID = "NA-225566";
  ROUTE_ID = "177_Kaduwela_Kollupitiya";

  preferences.begin("busconfig", false);
  preferences.putString("bus_id", BUS_ID);
  preferences.putString("route_id", ROUTE_ID);
  preferences.end();

  TELEMETRY_TOPIC = "bus/" + BUS_ID + "/telemetry";
  SAFE_SPEED_TOPIC = "bus/" + BUS_ID + "/safe-speed";
  STOP_DATA_TOPIC = "bus/" + BUS_ID + "/stop-data";
  CONTEXT_AWARE_TOPIC = "bus/" + BUS_ID + "/context-aware";
  DRIVER_MONITOR_TOPIC = "bus/" + BUS_ID + "/driver-monitor";

  Serial.println("Config loaded:");
  Serial.println("  Bus ID: " + BUS_ID);
  Serial.println("  Route ID: " + ROUTE_ID);
  Serial.println("  Telemetry Topic: " + TELEMETRY_TOPIC);
  Serial.println("  Safe Speed Topic: " + SAFE_SPEED_TOPIC);
  Serial.println("  Stop Data Topic: " + STOP_DATA_TOPIC);
  Serial.println("  Context-Aware Topic: " + CONTEXT_AWARE_TOPIC);
  Serial.println("  Driver Monitor Topic: " + DRIVER_MONITOR_TOPIC);
}

void saveConfig(String busId, String routeId) {
  preferences.begin("busconfig", false);
  preferences.putString("bus_id", busId);
  preferences.putString("route_id", routeId);
  preferences.end();

  BUS_ID = busId;
  ROUTE_ID = routeId;

  TELEMETRY_TOPIC = "bus/" + BUS_ID + "/telemetry";
  SAFE_SPEED_TOPIC = "bus/" + BUS_ID + "/safe-speed";
  STOP_DATA_TOPIC = "bus/" + BUS_ID + "/stop-data";
  CONTEXT_AWARE_TOPIC = "bus/" + BUS_ID + "/context-aware";
  DRIVER_MONITOR_TOPIC = "bus/" + BUS_ID + "/driver-monitor";
}

//////////////////////////////////////
// WIFI
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
// MQTT
//////////////////////////////////////

void connectMQTT() {
  int attempts = 0;
  while (!client.connected() && attempts < 3) {
    Serial.print("Connecting MQTT...");
    String clientId = "ESP32_TEST_" + BUS_ID;

    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      client.subscribe(SAFE_SPEED_TOPIC.c_str());
      client.subscribe(CONTEXT_AWARE_TOPIC.c_str());
      client.subscribe(DRIVER_MONITOR_TOPIC.c_str());
      Serial.println("Subscribed to: " + SAFE_SPEED_TOPIC);
      Serial.println("Subscribed to: " + CONTEXT_AWARE_TOPIC);
      Serial.println("Subscribed to: " + DRIVER_MONITOR_TOPIC);
    } else {
      Serial.print("failed, rc=");
      Serial.println(client.state());
      attempts++;
      delay(2000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.println("MQTT Received [" + String(topic) + "]: " + message);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  if (error) {
    Serial.print("JSON parse failed: ");
    Serial.println(error.c_str());
    return;
  }

  String topicStr = String(topic);

  // Handle safe-speed messages
  if (topicStr.endsWith("/safe-speed")) {
    if (doc.containsKey("safe_speed")) {
      float newSpeed = doc["safe_speed"].as<float>();
      safeSpeed = newSpeed;
      Serial.print(">>> SAFE SPEED UPDATED: ");
      Serial.print(safeSpeed, 1);
      Serial.println(" km/h");
    }
    if (doc.containsKey("location_name")) {
      locationName = doc["location_name"].as<String>();
      Serial.print(">>> LOCATION: ");
      Serial.println(locationName);
    }
    isOverSpeed = (speedKmh > safeSpeed);
  }

  // Handle context-aware predictions
  if (topicStr.endsWith("/context-aware")) {
    if (doc.containsKey("warning")) {
      camWarning = doc["warning"].as<String>();
    }
    if (doc.containsKey("proximity")) {
      camProximity = doc["proximity"].as<String>();
    }
    if (doc.containsKey("lane_warning")) {
      camLaneWarning = doc["lane_warning"].as<bool>();
    }
    if (doc.containsKey("wrong_side")) {
      camWrongSide = doc["wrong_side"].as<bool>();
    }
    Serial.print(">>> CAM: ");
    Serial.print(camWarning);
    Serial.print(" | Proximity: ");
    Serial.println(camProximity);
  }

  // Handle driver monitor predictions
  if (topicStr.endsWith("/driver-monitor")) {
    if (doc.containsKey("state")) {
      dmsState = doc["state"].as<String>();
    }
    if (doc.containsKey("severity")) {
      dmsSeverity = doc["severity"].as<String>();
    }
    if (doc.containsKey("phone")) {
      dmsPhone = doc["phone"].as<bool>();
    }
    if (doc.containsKey("seatbelt")) {
      dmsSeatbelt = doc["seatbelt"].as<bool>();
    }
    Serial.print(">>> DMS: ");
    Serial.print(dmsState);
    Serial.print(" (");
    Serial.print(dmsSeverity);
    Serial.println(")");
  }
}

//////////////////////////////////////
// SIMULATE PASSENGER ACTIVITY AT BUS STOP
//////////////////////////////////////

void simulatePassengerActivity() {
  // Random boarding: 1-6 passengers
  sessionIn = random(1, 7);
  // Random alighting: 0-3 passengers (can't go below 0 total)
  sessionOut = random(0, min(4, passengerCount + 1));

  passengerCount = passengerCount + sessionIn - sessionOut;
  if (passengerCount < 0) passengerCount = 0;
  if (passengerCount > 60) passengerCount = 60;

  passengerIn += sessionIn;
  passengerOut += sessionOut;

  // Weight = ~65kg per passenger + bus base weight variation
  busWeight = passengerCount * 65.0 + random(0, 50);

  Serial.print("Passenger Activity: IN=");
  Serial.print(sessionIn);
  Serial.print(" OUT=");
  Serial.print(sessionOut);
  Serial.print(" TOTAL=");
  Serial.print(passengerCount);
  Serial.print(" WEIGHT=");
  Serial.println(busWeight);
}

//////////////////////////////////////
// SEND TELEMETRY
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
  doc["passenger_in_count"] = passengerIn;
  doc["passenger_out_count"] = passengerOut;
  doc["total_passenger_count"] = passengerCount;
  doc["total_weight"] = busWeight;
  doc["gps_valid"] = gpsValid;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  client.publish(TELEMETRY_TOPIC.c_str(), payload.c_str());
  Serial.println("Telemetry: " + payload);
}

//////////////////////////////////////
// SEND STOP DATA (when bus leaves a stop)
//////////////////////////////////////

void sendStopData() {
  if (!client.connected()) {
    connectMQTT();
    if (!client.connected()) return;
  }

  StaticJsonDocument<512> doc;
  doc["bus_id"] = BUS_ID;
  doc["route_id"] = ROUTE_ID;
  doc["latitude"] = stopLatitude;
  doc["longitude"] = stopLongitude;
  doc["passenger_in_count"] = sessionIn;
  doc["passenger_out_count"] = sessionOut;
  doc["total_passenger_count"] = passengerCount;
  doc["load_cell_weight"] = busWeight;
  doc["speed"] = 0.0;
  doc["stop_duration_ms"] = stopDuration;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);
  client.publish(STOP_DATA_TOPIC.c_str(), payload.c_str());
  Serial.println("Stop Data Sent: " + payload);
}

//////////////////////////////////////
// DISPLAY
//////////////////////////////////////

void updateDisplay() {
  tft.fillScreen(ILI9341_BLACK);

  // Header
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(10, 5);
  tft.print("Bus TEST - ");
  tft.print(BUS_ID);

  // Status line
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(10, 28);
  tft.print("Route: ");
  tft.print(ROUTE_ID);
  tft.print(" | MQTT: ");
  tft.print(client.connected() ? "OK" : "NO");

  tft.drawLine(0, 40, 320, 40, ILI9341_DARKGREY);

  // Safe Speed - show exact predicted value
  tft.setTextSize(2);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(20, 50);
  tft.print("SAFE SPEED:");

  tft.setTextSize(3);
  tft.setTextColor(ILI9341_GREEN);
  tft.setCursor(20, 75);
  tft.print(safeSpeed, 1);
  tft.setTextSize(2);
  tft.print(" km/h");

  // Current speed comparison
  tft.setTextSize(2);
  tft.setCursor(20, 102);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("Speed: ");
  if (isOverSpeed) {
    tft.setTextColor(ILI9341_RED);
  } else {
    tft.setTextColor(ILI9341_GREEN);
  }
  tft.print(speedKmh, 1);
  tft.print(" km/h");
  if (isOverSpeed) {
    tft.setTextColor(ILI9341_RED);
    tft.print(" !");
  }

  tft.drawLine(0, 125, 320, 125, ILI9341_DARKGREY);

  // ---- BOTTOM: Two prediction panels ----

  // LEFT PANEL: Context-Aware Monitoring (Road)
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(5, 130);
  tft.print("ROAD MONITOR");

  // Warning state
  tft.setTextSize(2);
  tft.setCursor(5, 143);
  if (camWarning == "CLEAR") {
    tft.setTextColor(ILI9341_GREEN);
  } else if (camWarning == "OBJ CLOSE") {
    tft.setTextColor(ILI9341_YELLOW);
  } else {
    tft.setTextColor(ILI9341_RED);
  }
  tft.print(camWarning);

  // Proximity
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_WHITE);
  tft.setCursor(5, 165);
  tft.print("Obj: ");
  if (camProximity == "Very Close" || camProximity == "Close") {
    tft.setTextColor(ILI9341_RED);
  } else if (camProximity == "Near") {
    tft.setTextColor(ILI9341_YELLOW);
  } else {
    tft.setTextColor(ILI9341_GREEN);
  }
  tft.print(camProximity);

  // Lane/Wrong side indicators
  tft.setCursor(5, 178);
  if (camLaneWarning) {
    tft.setTextColor(ILI9341_RED);
    tft.print("LANE!");
  }
  if (camWrongSide) {
    tft.setTextColor(ILI9341_RED);
    tft.setCursor(5, 190);
    tft.print("WRONG SIDE!");
  }

  // Divider between panels
  tft.drawLine(160, 125, 160, 240, ILI9341_DARKGREY);

  // RIGHT PANEL: Driver Monitoring
  tft.setTextSize(1);
  tft.setTextColor(ILI9341_CYAN);
  tft.setCursor(165, 130);
  tft.print("DRIVER MONITOR");

  // DMS state
  tft.setTextSize(2);
  tft.setCursor(165, 143);
  if (dmsSeverity == "info") {
    tft.setTextColor(ILI9341_GREEN);
  } else if (dmsSeverity == "warning") {
    tft.setTextColor(ILI9341_YELLOW);
  } else {
    tft.setTextColor(ILI9341_RED);
  }
  // Truncate long states
  String dmsDisplay = dmsState;
  if (dmsDisplay.length() > 10) {
    dmsDisplay = dmsDisplay.substring(0, 10);
  }
  tft.print(dmsDisplay);

  // Phone & Seatbelt status
  tft.setTextSize(1);
  tft.setCursor(165, 165);
  tft.print("Phone: ");
  if (dmsPhone) {
    tft.setTextColor(ILI9341_RED);
    tft.print("YES!");
  } else {
    tft.setTextColor(ILI9341_GREEN);
    tft.print("No");
  }

  tft.setCursor(165, 178);
  tft.setTextColor(ILI9341_WHITE);
  tft.print("Belt: ");
  if (!dmsSeatbelt) {
    tft.setTextColor(ILI9341_RED);
    tft.print("MISSING!");
  } else {
    tft.setTextColor(ILI9341_GREEN);
    tft.print("OK");
  }

  // Bus status at very bottom
  tft.setTextSize(1);
  tft.setCursor(10, 225);
  if (busIsStopped) {
    tft.setTextColor(ILI9341_RED);
    tft.print("BUS STOPPED");
  } else {
    tft.setTextColor(ILI9341_GREEN);
    tft.print("MOVING ");
    tft.print(speedKmh, 0);
    tft.print("km/h");
  }
  tft.setTextColor(ILI9341_WHITE);
  tft.print("  P:");
  tft.print(passengerCount);
}

//////////////////////////////////////
// WEB SERVER
//////////////////////////////////////

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;padding:20px;max-width:400px;margin:auto;}";
  html += "input,button{width:100%;padding:12px;margin:8px 0;box-sizing:border-box;}";
  html += "button{background:#4CAF50;color:white;border:none;cursor:pointer;}";
  html += ".info{background:#e7f3ff;padding:10px;border-radius:5px;margin-bottom:20px;}</style>";
  html += "</head><body>";
  html += "<h2>Smart Bus TEST Config</h2>";
  html += "<div class='info'>";
  html += "<b>Current Config:</b><br>";
  html += "Bus ID: " + BUS_ID + "<br>";
  html += "Route ID: " + ROUTE_ID + "<br>";
  html += "IP: " + WiFi.localIP().toString() + "<br>";
  html += "MQTT: " + String(mqtt_server) + "<br>";
  html += "Mode: SIMULATOR</div>";
  html += "<form action='/save' method='POST'>";
  html += "<label>Bus ID:</label>";
  html += "<input type='text' name='bus_id' value='" + BUS_ID + "' required>";
  html += "<label>Route ID:</label>";
  html += "<input type='text' name='route_id' value='" + ROUTE_ID + "' required>";
  html += "<button type='submit'>Save & Restart</button>";
  html += "</form>";
  html += "<br><a href='/status'>View Status JSON</a>";
  html += "</body></html>";
  webServer.send(200, "text/html", html);
}

void handleSave() {
  if (webServer.hasArg("bus_id") && webServer.hasArg("route_id")) {
    saveConfig(webServer.arg("bus_id"), webServer.arg("route_id"));
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
  doc["current_stop"] = ROUTE_STOPS[currentStopIndex].name;
  doc["stop_index"] = currentStopIndex;
  doc["is_stopped"] = busIsStopped;
  doc["mode"] = "SIMULATOR";

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
// ADVANCE TO NEXT STOP
//////////////////////////////////////

void advanceToNextStop() {
  if (goingForward) {
    currentStopIndex++;
    if (currentStopIndex >= TOTAL_STOPS) {
      currentStopIndex = TOTAL_STOPS - 1;
      goingForward = false;
    }
  } else {
    currentStopIndex--;
    if (currentStopIndex < 0) {
      currentStopIndex = 0;
      goingForward = true;
    }
  }

  latitude = ROUTE_STOPS[currentStopIndex].lat;
  longitude = ROUTE_STOPS[currentStopIndex].lon;

  Serial.print("Moving to: ");
  Serial.print(ROUTE_STOPS[currentStopIndex].name);
  Serial.print(" (");
  Serial.print(latitude, 6);
  Serial.print(", ");
  Serial.print(longitude, 6);
  Serial.println(")");
}

//////////////////////////////////////
// SETUP
//////////////////////////////////////

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nSmart Bus System v8 TEST SIMULATOR Starting...");

  randomSeed(analogRead(0));

  loadConfig();

  // Set initial position
  latitude = ROUTE_STOPS[0].lat;
  longitude = ROUTE_STOPS[0].lon;
  busWeight = passengerCount * 65.0;

  // Initialize Display
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(2);
  tft.setCursor(20, 80);
  tft.print("Bus v8 TEST");
  tft.setCursor(20, 110);
  tft.print("Bus: " + BUS_ID);
  tft.setCursor(20, 140);
  tft.setTextColor(ILI9341_YELLOW);
  tft.print("SIMULATOR MODE");
  delay(2000);

  connectWiFi();

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(1024);

  setupWebServer();
  connectMQTT();

  Serial.println("Setup complete! Simulating route 177...");
  Serial.print("Total stops: ");
  Serial.println(TOTAL_STOPS);
}

//////////////////////////////////////
// MAIN LOOP
//////////////////////////////////////

void loop() {
  webServer.handleClient();

  if (!client.connected()) {
    connectMQTT();
  }
  client.loop();

  unsigned long now = millis();

  // ---- Bus Stop Simulation ----
  if (busIsStopped) {
    // Bus is at a stop, waiting
    speedKmh = 0.0;

    if (now - stopStartTime >= STOP_WAIT_TIME) {
      // Done waiting — send stop data and start moving
      stopDuration = now - stopStartTime;
      Serial.println("BUS LEAVING STOP - sending stop data");
      sendStopData();
      busIsStopped = false;

      // Advance to next stop
      advanceToNextStop();
      speedKmh = random(25, 50);
      lastStopAdvance = now;
    }
  } else {
    // Bus is moving — advance every MOVE_INTERVAL
    speedKmh = random(25, 50);

    if (now - lastStopAdvance >= MOVE_INTERVAL) {
      stopCounter++;

      // Stop at every 3rd stop to simulate bus stop behavior
      if (stopCounter % 3 == 0) {
        busIsStopped = true;
        stopLatitude = latitude;
        stopLongitude = longitude;
        stopStartTime = now;
        speedKmh = 0.0;

        // Simulate passenger activity at this stop
        simulatePassengerActivity();

        Serial.print("BUS STOPPED at: ");
        Serial.println(ROUTE_STOPS[currentStopIndex].name);
      } else {
        // Just passing through — advance
        advanceToNextStop();
        // Update weight based on current passengers
        busWeight = passengerCount * 65.0 + random(0, 30);
      }

      lastStopAdvance = now;
    }
  }

  isOverSpeed = (speedKmh > safeSpeed);

  // Send telemetry every 2 seconds
  if (now - lastTelemetrySend >= TELEMETRY_INTERVAL) {
    sendTelemetry();
    lastTelemetrySend = now;
  }

  // Update display every second
  if (now - lastDisplayUpdate >= DISPLAY_INTERVAL) {
    updateDisplay();
    lastDisplayUpdate = now;
  }
}
