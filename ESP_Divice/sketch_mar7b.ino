/*
SMART BUS SYSTEM
ESP32 Firmware v6
Components:
ESP32
GPS NEO6M
HX711 Load Cell
2 IR Sensors
ILI9341 TFT Display
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>
#include <HX711.h>

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

//////////////////////////////////////
// WIFI
//////////////////////////////////////

const char* ssid = "SLT-4G_BD8DB";
const char* password = "prolink12345";

const char* RUN_API = "http://192.168.1.24:5000/bus/telemetry";
const char* STOP_API = "http://192.168.1.24:5000/bus/stop-event";

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

//////////////////////////////////////////////////////////
// WIFI CONNECT
//////////////////////////////////////////////////////////

void connectWiFi() {

  Serial.println("Connecting WiFi");

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println(WiFi.localIP());
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
// PASSENGER COUNTING (FIXED LOGIC)
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

  tft.setTextColor(ILI9341_WHITE);

  // Speed
  tft.setCursor(10, 50);
  tft.print("Speed: ");
  tft.print(speedKmh);
  tft.println(" km/h");

  // Passenger total
  tft.setCursor(10, 80);
  tft.print("Passengers: ");
  tft.println(passengerCount);

  // Passenger IN
  tft.setCursor(10, 110);
  tft.print("IN: ");
  tft.println(passengerIn);

  // Passenger OUT
  tft.setCursor(10, 140);
  tft.print("OUT: ");
  tft.println(passengerOut);

  // TOTAL WEIGHT
  tft.setCursor(10, 170);
  tft.print("Total Wt: ");
  tft.print(busWeight);
  tft.println(" kg");

  // Latitude
  tft.setCursor(10, 200);
  tft.print("Lat:");
  tft.println(latitude, 4);
}

//////////////////////////////////////////////////////////
// SEND RUNNING DATA
//////////////////////////////////////////////////////////

void sendRunningData() {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;

  StaticJsonDocument<256> doc;

  doc["gps_latitude"] = latitude;
  doc["gps_longitude"] = longitude;
  doc["speed"] = speedKmh;

  String payload;
  serializeJson(doc, payload);

  http.begin(RUN_API);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  if (httpCode > 0) {

    String response = http.getString();

    StaticJsonDocument<200> res;
    deserializeJson(res, response);

    safeSpeed = res["safe_speed"] | 40;
    location_name = res["location_name"] | "Unknown";
  }

  http.end();
}

//////////////////////////////////////////////////////////
// SEND STOP EVENT
//////////////////////////////////////////////////////////

void sendStopEvent() {

  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;

  StaticJsonDocument<256> doc;

  doc["gps_latitude"] = latitude;
  doc["gps_longitude"] = longitude;

  doc["passenger_in"] = passengerIn;
  doc["passenger_out"] = passengerOut;
  doc["passenger_count"] = passengerCount;
  doc["bus_weight"] = busWeight;

  String payload;
  serializeJson(doc, payload);

  http.begin(STOP_API);
  http.addHeader("Content-Type", "application/json");

  http.POST(payload);

  http.end();

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

  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);

  scale.begin(HX_DOUT, HX_SCK);
  scale.set_scale(2280.f);
  scale.tare();

  tft.begin();
  tft.setRotation(1);

  connectWiFi();
}

//////////////////////////////////////////////////////////
// LOOP
//////////////////////////////////////////////////////////

void loop() {

  readGPS();

  if (speedKmh < 2) {

    passengerCounter();
    readWeight();

    if (busMoving) {
      sendStopEvent();
      busMoving = false;
    }

  } else {

    busMoving = true;

    if (millis() - lastSend > 2000) {
      sendRunningData();
      lastSend = millis();
    }
  }

  if (millis() - lastDisplay > 1000) {
    updateDisplay();
    lastDisplay = millis();
  }

  Serial.println("Loop running...");
}