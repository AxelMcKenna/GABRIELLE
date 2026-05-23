/* Drone producer. Simulates Jetson inference output: emits a positional
 * heartbeat every HEARTBEAT_S, and a detection frame whenever life_conf or
 * damage_conf cross THRESHOLD. Stays well under 30 B/s in steady state. */

#include "locus_frame.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define HEARTBEAT_S       30
#define TICK_MS           200
#define DETECT_THRESHOLD  128   /* 0.5 on the 0–255 scale */

static double frand(void) { return (double)rand() / (double)RAND_MAX; }

static uint8_t roll_confidence(void) {
    /* 5% chance of a hit per tick — most ticks emit nothing. */
    return (frand() < 0.05) ? (uint8_t)(200 + frand() * 55) : (uint8_t)(frand() * 80);
}

int main(int argc, char **argv) {
    uint16_t device_id = (argc > 1) ? (uint16_t)atoi(argv[1]) : 2001;
    srand((unsigned)time(NULL) ^ device_id);

    /* Christchurch-ish starting pose — drift over time. */
    double lat = -43.5320, lon = 172.6306;
    int16_t alt = 80;

    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    uint32_t seq = 0;
    time_t last_heartbeat = 0;

    for (;;) {
        lat += (frand() - 0.5) * 1e-5;
        lon += (frand() - 0.5) * 1e-5;

        const uint8_t life_conf   = roll_confidence();
        const uint8_t damage_conf = roll_confidence();

        const time_t now    = time(NULL);
        const int crossed   = (life_conf >= DETECT_THRESHOLD) || (damage_conf >= DETECT_THRESHOLD);
        const int heartbeat = (now - last_heartbeat) >= HEARTBEAT_S;

        if (crossed || heartbeat) {
            locus_header_t h = {
                .type        = FRAME_DRONE,
                .device_id   = device_id,
                .seq         = seq++,
                .timestamp_s = (uint32_t)now,
                .status      = STATUS_OK,
            };
            locus_drone_t d = {
                .lat_1e7         = (int32_t)(lat * 1e7),
                .lon_1e7         = (int32_t)(lon * 1e7),
                .alt_m           = alt,
                .life_conf_255   = life_conf,
                .damage_conf_255 = damage_conf,
            };

            ssize_t n = locus_encode_drone(buf, sizeof(buf), &h, &d);
            if (n < 0) { fprintf(stderr, "encode failed\n"); return 1; }
            if (fwrite(buf, 1, (size_t)n, stdout) != (size_t)n) return 1;
            fflush(stdout);

            last_heartbeat = now;
        }

        usleep(TICK_MS * 1000);
    }
}
