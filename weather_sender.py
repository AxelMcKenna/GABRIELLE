import serial
import socket
import time

SERIAL_PORT = "COM8"          # change this if your Arduino is on a different COM port
BAUD_RATE = 9600              # must match Serial.begin(9600)

PARTNER_IP = "192.168.1.45"   # change this to your partner's laptop IP
UDP_PORT = 5005

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

time.sleep(2)

print("Reading Arduino serial and forwarding packets...")

while True:
    line = ser.readline().strip()

    if line:
        sock.sendto(line, (PARTNER_IP, UDP_PORT))
        print("Sent:", line.decode(errors="ignore"))
