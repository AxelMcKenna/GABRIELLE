import serial
import json

SERIAL_PORT = "COM8"   # change to his Arduino COM port
BAUD_RATE = 9600

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)

print("Reading weather data from Arduino...")
print("-----------------------------------")

while True:
    line = ser.readline().decode(errors="ignore").strip()

    if not line:
        continue

    if not line.startswith("{"):
        print("Skipped:", line)
        continue

    try:
        packet = json.loads(line)

        if packet.get("status") == "ok":
            print(
                f"Seq: {packet.get('seq')} | "
                f"Temp: {packet.get('temperature_c')} °C | "
                f"Humidity: {packet.get('humidity_pct')} %"
            )
        else:
            print("Sensor error:", packet)

    except json.JSONDecodeError:
        print("Bad JSON:", line)