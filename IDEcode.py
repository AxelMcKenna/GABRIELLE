#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

unsigned long seq = 0;

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("{\"type\":\"weather\",\"sensor_model\":\"XC4520\",\"status\":\"sensor_error\"}");
  } else {
    Serial.print("{\"type\":\"weather\",");
    Serial.print("\"sensor_model\":\"XC4520\",");
    Serial.print("\"seq\":");
    Serial.print(seq);
    Serial.print(",\"timestamp_ms\":");
    Serial.print(millis());
    Serial.print(",\"temperature_c\":");
    Serial.print(temperature, 1);
    Serial.print(",\"humidity_pct\":");
    Serial.print(humidity, 1);
    Serial.println(",\"status\":\"ok\"}");
    seq++;
  }

  delay(1000);
}