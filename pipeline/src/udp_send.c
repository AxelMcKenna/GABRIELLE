/* Reads frames from stdin (using the same magic-byte resync as relay), and
 * forwards each one as a single UDP datagram. One frame per packet — the
 * AST link delivers UDP datagrams whole-or-not-at-all, so the inline magic
 * and CRC become redundant on this transport but cost nothing to leave in. */

#include "locus_frame.h"
#include "locus_stream.h"

#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

int main(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: %s <host> <port>\n", argv[0]);
        return 2;
    }

    struct addrinfo hints = {0}, *res = NULL;
    hints.ai_family   = AF_UNSPEC;
    hints.ai_socktype = SOCK_DGRAM;
    if (getaddrinfo(argv[1], argv[2], &hints, &res) != 0 || !res) {
        fprintf(stderr, "getaddrinfo failed\n");
        return 1;
    }

    int sock = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
    if (sock < 0) { perror("socket"); freeaddrinfo(res); return 1; }

    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    unsigned long sent = 0, errors = 0;

    for (;;) {
        ssize_t n = locus_read_frame_fd(STDIN_FILENO, buf, sizeof(buf));
        if (n == 0) break;
        if (n < 0)  { errors++; if (n == -1) break; continue; }

        ssize_t w = sendto(sock, buf, (size_t)n, 0, res->ai_addr, res->ai_addrlen);
        if (w != n) { perror("sendto"); errors++; continue; }
        sent++;
    }

    fprintf(stderr, "udp_send: sent=%lu errors=%lu\n", sent, errors);
    freeaddrinfo(res);
    close(sock);
    return 0;
}
