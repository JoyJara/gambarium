#include <OneWire.h>
#include <DallasTemperature.h>

// Pines
#define ONE_WIRE_BUS 2     // Pin del DS18B20
#define PH_PIN A0          // Pin del sensor de pH

// Inicialización de librerías
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Calibración del sensor de pH
// Ajusta estos valores según tus pruebas:
const float m = -10.0;   // Pendiente (cambia si tu calibración es distinta)
const float b = 31.4;    // Intersección (offset)

// Constantes
const float VREF = 5.0;  // Voltaje de referencia del Arduino (5V)
const int ADC_RES = 1023; // Resolución ADC (10 bits)

void setup() {
  Serial.begin(9600);
  sensors.begin();
}

void loop() {
  // ----- Temperatura -----
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  float tempF = tempC * 9.0 / 5.0 + 32.0;

  // ----- Lectura de pH -----
  int rawPh = analogRead(PH_PIN);
  float voltagePh = rawPh * (VREF / ADC_RES);
  float phValue = m * voltagePh + b;

  // ----- Timestamp -----
  unsigned long ts = millis();

  // ----- Envío de datos -----
  Serial.print("{\"tempC\":");
  Serial.print(tempC, 2);
  Serial.print(",\"tempF\":");
  Serial.print(tempF, 2);
  Serial.print(",\"ph\":");
  Serial.print(phValue, 2);
  Serial.print(",\"ts\":");
  Serial.print(ts);
  Serial.println("}");

  delay(2000);
}
