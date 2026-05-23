/* Ground sensor producer. Emits encoded weather frames to stdout at 0.1 Hz
 * by default — matches the 10s cadence we expect over AST. Override with
 * LOCUS_WEATHER_PERIOD_MS in the env. */

#include "locus_frame.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

static double frand(void) { return (double)rand() / (double)RAND_MAX; }

int main(int argc, char **argv) {
    uint16_t device_id = (argc > 1) ? (uint16_t)atoi(argv[1]) : 1001;

    const char *period_env = getenv("LOCUS_WEATHER_PERIOD_MS");
    unsigned period_ms = period_env ? (unsigned)atoi(period_env) : 10000;
    if (period_ms < 100) period_ms = 100;

    srand((unsigned)time(NULL) ^ device_id);

    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    uint32_t seq = 0;

    for (;;) {
        locus_header_t h = {
            .type        = FRAME_WEATHER,
            .device_id   = device_id,
            .seq         = seq++,
            .timestamp_s = (uint32_t)time(NULL),
            .status      = STATUS_OK,
        };
        locus_weather_t w = {
            .temperature_c100 = (int16_t)((15.0 + 10.0 * frand()) * 100.0),
            .humidity_2pct    = (uint8_t)(2.0 * (40.0 + 40.0 * frand())),
        };

        ssize_t n = locus_encode_weather(buf, sizeof(buf), &h, &w);
        if (n < 0) { fprintf(stderr, "encode failed\n"); return 1; }

        if (fwrite(buf, 1, (size_t)n, stdout) != (size_t)n) return 1;
        fflush(stdout);

        usleep(period_ms * 1000);
    }
}
