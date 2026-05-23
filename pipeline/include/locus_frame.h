#ifndef LOCUS_FRAME_H
#define LOCUS_FRAME_H

#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>

#ifdef __cplusplus
extern "C" {
#endif

#define LOCUS_FRAME_MAGIC      0x4C  /* 'L' — single-byte sync marker */
#define LOCUS_HEADER_BYTES     13
#define LOCUS_WEATHER_BYTES    3
#define LOCUS_DRONE_BYTES      12
#define LOCUS_CRC_BYTES        1
#define LOCUS_FRAME_MAX_BYTES  (LOCUS_HEADER_BYTES + LOCUS_DRONE_BYTES + LOCUS_CRC_BYTES)

typedef enum {
    FRAME_WEATHER = 0,
    FRAME_DRONE   = 1,
} frame_type_t;

typedef enum {
    STATUS_OK       = 0,
    STATUS_DEGRADED = 1,
    STATUS_FAULT    = 2,
} locus_status_t;

typedef struct {
    uint8_t  type;
    uint16_t device_id;
    uint32_t seq;
    uint32_t timestamp_s;
    uint8_t  status;
} locus_header_t;

typedef struct {
    int16_t temperature_c100;
    uint8_t humidity_2pct;
} locus_weather_t;

typedef struct {
    int32_t lat_1e7;
    int32_t lon_1e7;
    int16_t alt_m;
    uint8_t life_conf_255;
    uint8_t damage_conf_255;
} locus_drone_t;

ssize_t locus_encode_weather(uint8_t *buf, size_t bufsz,
                             const locus_header_t *h,
                             const locus_weather_t *w);

ssize_t locus_encode_drone(uint8_t *buf, size_t bufsz,
                           const locus_header_t *h,
                           const locus_drone_t *d);

/* Returns bytes consumed on success, -1 on CRC failure, -2 on bad magic,
 * -3 on unknown type, -4 on short buffer. */
ssize_t locus_decode(const uint8_t *buf, size_t len,
                     locus_header_t *h,
                     locus_weather_t *w,
                     locus_drone_t *d);

uint8_t locus_crc8(const uint8_t *data, size_t len);

#ifdef __cplusplus
}
#endif

#endif
