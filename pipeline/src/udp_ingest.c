/* AST-side UDP receiver. Binds a UDP port, decodes each datagram as a
 * single frame, prints decoded line to stderr. */

#include "locus_frame.h"

#include <arpa/inet.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

int main(int argc, char **argv) {
    if (argc < 2) {
        fprintf(stderr, "usage: %s <port>\n", argv[0]);
        return 2;
    }
    int port_i = atoi(argv[1]);
    if (port_i <= 0 || port_i > 65535) {
        fprintf(stderr, "bad port: %d\n", port_i);
        return 2;
    }

    int sock = socket(AF_INET, SOCK_DGRAM, 0);
    if (sock < 0) { perror("socket"); return 1; }

    struct sockaddr_in addr = {0};
    addr.sin_family      = AF_INET;
    addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr.sin_port        = htons((uint16_t)port_i);
    if (bind(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("bind");
        close(sock);
        return 1;
    }

    fprintf(stderr, "udp_ingest: listening on UDP/%d\n", port_i);

    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    locus_header_t  h;
    locus_weather_t w;
    locus_drone_t   d;
    unsigned long ok = 0, bad = 0;

    for (;;) {
        struct sockaddr_in from;
        socklen_t flen = sizeof(from);
        ssize_t n = recvfrom(sock, buf, sizeof(buf), 0,
                             (struct sockaddr *)&from, &flen);
        if (n < 0) { perror("recvfrom"); break; }
        if (n == 0) continue;

        ssize_t m = locus_decode(buf, (size_t)n, &h, &w, &d);
        if (m < 0) { bad++; continue; }
        ok++;

        char ip[INET_ADDRSTRLEN] = "?";
        inet_ntop(AF_INET, &from.sin_addr, ip, sizeof(ip));

        if (h.type == FRAME_WEATHER) {
            fprintf(stderr,
                    "[%u] from %s dev=%u seq=%u  WX  temp=%.2fC humidity=%.1f%%\n",
                    h.timestamp_s, ip, h.device_id, h.seq,
                    w.temperature_c100 / 100.0,
                    w.humidity_2pct / 2.0);
        } else {
            fprintf(stderr,
                    "[%u] from %s dev=%u seq=%u  DR  lat=%.5f lon=%.5f alt=%dm life=%.2f damage=%.2f\n",
                    h.timestamp_s, ip, h.device_id, h.seq,
                    d.lat_1e7 / 1e7, d.lon_1e7 / 1e7, d.alt_m,
                    d.life_conf_255 / 255.0,
                    d.damage_conf_255 / 255.0);
        }
    }

    fprintf(stderr, "udp_ingest: ok=%lu bad=%lu\n", ok, bad);
    close(sock);
    return 0;
}
