import socket
import json

UDP_IP = "0.0.0.0"
UDP_PORT = 5005

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind((UDP_IP, UDP_PORT))

print(f"Listening for weather packets on port {UDP_PORT}...")

while True:
    data, addr = sock.recvfrom(2048)
    line = data.decode(errors="ignore").strip()

    try:
        packet = json.loads(line)
        print(
            f"From {addr[0]} | "
            f"seq={packet.get('seq')} | "
            f"T={packet.get('temperature_c')} C | "
            f"H={packet.get('humidity_pct')} % | "
            f"status={packet.get('status')}"
        )
    except json.JSONDecodeError:
        print(f"Bad packet from {addr}: {line}")
