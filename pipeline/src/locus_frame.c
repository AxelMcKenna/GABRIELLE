#include "locus_frame.h"

#include <string.h>

static void put_u16_le(uint8_t *b, uint16_t v) {
    b[0] = (uint8_t)v;
    b[1] = (uint8_t)(v >> 8);
}

static void put_u32_le(uint8_t *b, uint32_t v) {
    b[0] = (uint8_t)v;
    b[1] = (uint8_t)(v >> 8);
    b[2] = (uint8_t)(v >> 16);
    b[3] = (uint8_t)(v >> 24);
}

static uint16_t get_u16_le(const uint8_t *b) {
    return (uint16_t)((uint16_t)b[0] | ((uint16_t)b[1] << 8));
}

static uint32_t get_u32_le(const uint8_t *b) {
    return (uint32_t)b[0]
         | ((uint32_t)b[1] << 8)
         | ((uint32_t)b[2] << 16)
         | ((uint32_t)b[3] << 24);
}

uint8_t locus_crc8(const uint8_t *data, size_t len) {
    /* CRC-8/CCITT, poly 0x07, init 0x00 — standard for telemetry. */
    uint8_t crc = 0;
    for (size_t i = 0; i < len; i++) {
        crc ^= data[i];
        for (int j = 0; j < 8; j++) {
            crc = (crc & 0x80) ? (uint8_t)((crc << 1) ^ 0x07) : (uint8_t)(crc << 1);
        }
    }
    return crc;
}

static size_t write_header(uint8_t *buf, const locus_header_t *h) {
    buf[0] = LOCUS_FRAME_MAGIC;
    buf[1] = h->type;
    put_u16_le(&buf[2], h->device_id);
    put_u32_le(&buf[4], h->seq);
    put_u32_le(&buf[8], h->timestamp_s);
    buf[12] = h->status;
    return LOCUS_HEADER_BYTES;
}

static void read_header(const uint8_t *buf, locus_header_t *h) {
    h->type        = buf[1];
    h->device_id   = get_u16_le(&buf[2]);
    h->seq         = get_u32_le(&buf[4]);
    h->timestamp_s = get_u32_le(&buf[8]);
    h->status      = buf[12];
}

ssize_t locus_encode_weather(uint8_t *buf, size_t bufsz,
                             const locus_header_t *h,
                             const locus_weather_t *w) {
    const size_t need = LOCUS_HEADER_BYTES + LOCUS_WEATHER_BYTES + LOCUS_CRC_BYTES;
    if (bufsz < need) return -1;

    size_t n = write_header(buf, h);
    buf[1] = FRAME_WEATHER;

    put_u16_le(&buf[n], (uint16_t)w->temperature_c100);
    buf[n + 2] = w->humidity_2pct;
    n += LOCUS_WEATHER_BYTES;

    buf[n] = locus_crc8(buf, n);
    return (ssize_t)(n + 1);
}

ssize_t locus_encode_drone(uint8_t *buf, size_t bufsz,
                           const locus_header_t *h,
                           const locus_drone_t *d) {
    const size_t need = LOCUS_HEADER_BYTES + LOCUS_DRONE_BYTES + LOCUS_CRC_BYTES;
    if (bufsz < need) return -1;

    size_t n = write_header(buf, h);
    buf[1] = FRAME_DRONE;

    put_u32_le(&buf[n],     (uint32_t)d->lat_1e7);
    put_u32_le(&buf[n + 4], (uint32_t)d->lon_1e7);
    put_u16_le(&buf[n + 8], (uint16_t)d->alt_m);
    buf[n + 10] = d->life_conf_255;
    buf[n + 11] = d->damage_conf_255;
    n += LOCUS_DRONE_BYTES;

    buf[n] = locus_crc8(buf, n);
    return (ssize_t)(n + 1);
}

ssize_t locus_decode(const uint8_t *buf, size_t len,
                     locus_header_t *h,
                     locus_weather_t *w,
                     locus_drone_t *d) {
    if (len < LOCUS_HEADER_BYTES + 1) return -4;
    if (buf[0] != LOCUS_FRAME_MAGIC)  return -2;

    const uint8_t type = buf[1];
    size_t body_len;
    if      (type == FRAME_WEATHER) body_len = LOCUS_WEATHER_BYTES;
    else if (type == FRAME_DRONE)   body_len = LOCUS_DRONE_BYTES;
    else return -3;

    const size_t total = LOCUS_HEADER_BYTES + body_len + LOCUS_CRC_BYTES;
    if (len < total) return -4;

    const uint8_t crc_expected = locus_crc8(buf, LOCUS_HEADER_BYTES + body_len);
    if (crc_expected != buf[LOCUS_HEADER_BYTES + body_len]) return -1;

    read_header(buf, h);

    const uint8_t *body = &buf[LOCUS_HEADER_BYTES];
    if (type == FRAME_WEATHER) {
        w->temperature_c100 = (int16_t)get_u16_le(&body[0]);
        w->humidity_2pct    = body[2];
    } else {
        d->lat_1e7          = (int32_t)get_u32_le(&body[0]);
        d->lon_1e7          = (int32_t)get_u32_le(&body[4]);
        d->alt_m            = (int16_t)get_u16_le(&body[8]);
        d->life_conf_255    = body[10];
        d->damage_conf_255  = body[11];
    }

    return (ssize_t)total;
}
