#include "locus_stream.h"

#include <errno.h>
#include <unistd.h>

static int read_exact(int fd, uint8_t *buf, size_t n) {
    size_t got = 0;
    while (got < n) {
        ssize_t r = read(fd, buf + got, n - got);
        if (r == 0) return 0;
        if (r < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        got += (size_t)r;
    }
    return 1;
}

ssize_t locus_read_frame_fd(int fd, uint8_t *buf, size_t bufsz) {
    if (bufsz < LOCUS_FRAME_MAX_BYTES) return -2;

    /* Resync on magic byte. */
    for (;;) {
        uint8_t b;
        ssize_t r = read(fd, &b, 1);
        if (r == 0) return 0;
        if (r < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        if (b == LOCUS_FRAME_MAGIC) { buf[0] = b; break; }
    }

    int rc = read_exact(fd, &buf[1], LOCUS_HEADER_BYTES - 1);
    if (rc == 0) return 0;
    if (rc < 0) return -1;

    const uint8_t type = buf[1];
    size_t body_len;
    if      (type == FRAME_WEATHER) body_len = LOCUS_WEATHER_BYTES;
    else if (type == FRAME_DRONE)   body_len = LOCUS_DRONE_BYTES;
    else return -3;

    rc = read_exact(fd, &buf[LOCUS_HEADER_BYTES], body_len + LOCUS_CRC_BYTES);
    if (rc == 0) return 0;
    if (rc < 0) return -1;

    return (ssize_t)(LOCUS_HEADER_BYTES + body_len + LOCUS_CRC_BYTES);
}
