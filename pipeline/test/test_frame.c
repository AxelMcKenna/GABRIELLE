#include "locus_frame.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

static int failures = 0;

#define CHECK(cond, msg) do { \
    if (!(cond)) { fprintf(stderr, "FAIL: %s (line %d)\n", msg, __LINE__); failures++; } \
} while (0)

static void test_weather_roundtrip(void) {
    locus_header_t h_in = {
        .type = FRAME_WEATHER, .device_id = 4242, .seq = 7,
        .timestamp_s = 1716462000, .status = STATUS_OK,
    };
    locus_weather_t w_in = { .temperature_c100 = 1837, .humidity_2pct = 121 };

    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    ssize_t n = locus_encode_weather(buf, sizeof(buf), &h_in, &w_in);
    CHECK(n == LOCUS_HEADER_BYTES + LOCUS_WEATHER_BYTES + LOCUS_CRC_BYTES,
          "weather encoded length");

    locus_header_t h_out;
    locus_weather_t w_out;
    locus_drone_t d_out;
    ssize_t m = locus_decode(buf, (size_t)n, &h_out, &w_out, &d_out);
    CHECK(m == n, "weather decode consumes full frame");
    CHECK(h_out.device_id == 4242 && h_out.seq == 7, "weather header preserved");
    CHECK(w_out.temperature_c100 == 1837, "weather temp preserved");
    CHECK(w_out.humidity_2pct == 121, "weather humidity preserved");
}

static void test_drone_roundtrip(void) {
    locus_header_t h_in = {
        .type = FRAME_DRONE, .device_id = 2001, .seq = 99,
        .timestamp_s = 1716462123, .status = STATUS_DEGRADED,
    };
    locus_drone_t d_in = {
        .lat_1e7 = -435320000, .lon_1e7 = 1726306000,
        .alt_m = 120, .life_conf_255 = 210, .damage_conf_255 = 30,
    };

    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    ssize_t n = locus_encode_drone(buf, sizeof(buf), &h_in, &d_in);
    CHECK(n == LOCUS_HEADER_BYTES + LOCUS_DRONE_BYTES + LOCUS_CRC_BYTES,
          "drone encoded length");
    CHECK(n <= 30, "drone frame within 30 B budget");

    locus_header_t h_out;
    locus_weather_t w_out;
    locus_drone_t d_out;
    ssize_t m = locus_decode(buf, (size_t)n, &h_out, &w_out, &d_out);
    CHECK(m == n, "drone decode consumes full frame");
    CHECK(h_out.status == STATUS_DEGRADED, "drone status preserved");
    CHECK(d_out.lat_1e7 == -435320000, "drone lat preserved");
    CHECK(d_out.lon_1e7 == 1726306000, "drone lon preserved");
    CHECK(d_out.alt_m == 120, "drone alt preserved");
    CHECK(d_out.life_conf_255 == 210, "drone life conf preserved");
    CHECK(d_out.damage_conf_255 == 30, "drone damage conf preserved");
}

static void test_crc_rejects_corruption(void) {
    locus_header_t h_in = {
        .type = FRAME_DRONE, .device_id = 1, .seq = 1,
        .timestamp_s = 1, .status = STATUS_OK,
    };
    locus_drone_t d_in = {0};
    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    ssize_t n = locus_encode_drone(buf, sizeof(buf), &h_in, &d_in);
    CHECK(n > 0, "drone encode succeeded");

    buf[5] ^= 0x01;  /* flip a bit in the seq */
    locus_header_t h_out; locus_weather_t w_out; locus_drone_t d_out;
    ssize_t m = locus_decode(buf, (size_t)n, &h_out, &w_out, &d_out);
    CHECK(m == -1, "corrupted frame rejected by CRC");
}

static void test_bad_magic_rejected(void) {
    locus_header_t h_in = { .type = FRAME_WEATHER };
    locus_weather_t w_in = {0};
    uint8_t buf[LOCUS_FRAME_MAX_BYTES];
    ssize_t n = locus_encode_weather(buf, sizeof(buf), &h_in, &w_in);
    buf[0] = 0xFF;
    locus_header_t h_out; locus_weather_t w_out; locus_drone_t d_out;
    ssize_t m = locus_decode(buf, (size_t)n, &h_out, &w_out, &d_out);
    CHECK(m == -2, "bad magic rejected");
}

int main(void) {
    test_weather_roundtrip();
    test_drone_roundtrip();
    test_crc_rejects_corruption();
    test_bad_magic_rejected();

    if (failures) {
        fprintf(stderr, "%d test(s) failed\n", failures);
        return 1;
    }
    printf("all tests passed\n");
    return 0;
}
