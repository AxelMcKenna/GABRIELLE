#ifndef LOCUS_STREAM_H
#define LOCUS_STREAM_H

#include "locus_frame.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Read one complete frame from a byte stream (e.g. UART, stdin).
 * Skips bytes until LOCUS_FRAME_MAGIC, then reads header + body + CRC.
 *
 * Returns: bytes written to buf on success,
 *          0 on EOF,
 *         -1 on I/O error,
 *         -2 if buf too small,
 *         -3 on unknown frame type (caller should keep reading to resync). */
ssize_t locus_read_frame_fd(int fd, uint8_t *buf, size_t bufsz);

#ifdef __cplusplus
}
#endif

#endif
