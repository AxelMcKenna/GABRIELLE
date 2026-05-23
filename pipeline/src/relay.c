/* Serial / stdin consumer for dev. Uses locus_stream's resync reader so the
 * UDP sender (udp_send.c) and AST gateway can reuse the same parser. */

#include "locus_frame.h"
#include "locus_stream.h"

#include <stdio.h>
#include <unistd.h>

static void print_frame(const locus_header_t *h,
                        const locus_weather_t *w,
                        const locus_drone_t *d) {
    if (h->type == FRAME_WEATHER) {
        fprintf(stderr,
                "[%u] dev=%u seq=%u status=%u  WX  temp=%.2fC humidity=%.1f%%\n",
                h->timestamp_s, h->device_id, h->seq, h->status,
                w->temperature_c100 / 100.0,
                w->humidity_2pct / 2.0);
    } else {
        fprintf(stderr,
                "[%u] dev=%u seq=%u status=%u  DR  lat=%.5f lon=%.5f alt=%dm life=%.2f damage=%.2f\n",
                h->timestamp_s, h->device_id, h->seq, h->status,
                d->lat_1e7 / 1e7, d->lon_1e7 / 1e7, d->alt_m,
                d->life_conf_255 / 255.0,
                d->damage_conf_255 / 255.0);
    }
}

int main(void) {
    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    locus_header_t  h;
    locus_weather_t w;
    locus_drone_t   d;
    unsigned long ok = 0, dropped = 0;

    for (;;) {
        ssize_t n = locus_read_frame_fd(STDIN_FILENO, buf, sizeof(buf));
        if (n == 0) break;
        if (n < 0)  { dropped++; if (n == -1) break; continue; }

        ssize_t m = locus_decode(buf, (size_t)n, &h, &w, &d);
        if (m < 0) { dropped++; continue; }

        ok++;
        print_frame(&h, &w, &d);
    }

    fprintf(stderr, "relay: ok=%lu dropped=%lu\n", ok, dropped);
    return 0;
}
