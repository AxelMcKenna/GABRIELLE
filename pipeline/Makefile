CC      ?= cc
CFLAGS  ?= -std=c11 -O2 -Wall -Wextra -Wpedantic -Wshadow -Wconversion
CPPFLAGS = -Iinclude
BUILD   = build

LIB_OBJS = $(BUILD)/locus_frame.o $(BUILD)/locus_stream.o
BINS     = $(BUILD)/weather_sim $(BUILD)/drone_sim \
           $(BUILD)/relay $(BUILD)/udp_send $(BUILD)/udp_ingest \
           $(BUILD)/test_frame

.PHONY: all test clean run run_udp

all: $(BINS)

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/%.o: src/%.c include/locus_frame.h include/locus_stream.h | $(BUILD)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

$(BUILD)/test_frame.o: test/test_frame.c include/locus_frame.h | $(BUILD)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

$(BUILD)/weather_sim: $(BUILD)/weather_sim.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD)/drone_sim: $(BUILD)/drone_sim.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD)/relay: $(BUILD)/relay.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD)/udp_send: $(BUILD)/udp_send.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD)/udp_ingest: $(BUILD)/udp_ingest.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

$(BUILD)/test_frame: $(BUILD)/test_frame.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

test: $(BUILD)/test_frame
	./$(BUILD)/test_frame

# Local end-to-end smoke: drone simulator → relay over a stdin pipe (3s).
run: $(BUILD)/drone_sim $(BUILD)/relay
	@( ./$(BUILD)/drone_sim & echo $$! > $(BUILD)/.sim.pid ) | \
	  ./$(BUILD)/relay & RELAY=$$!; \
	  sleep 3; \
	  kill `cat $(BUILD)/.sim.pid` $$RELAY 2>/dev/null; \
	  wait 2>/dev/null; rm -f $(BUILD)/.sim.pid; true

# UDP smoke: ingest in background, drone simulator → udp_send → ingest (3s).
run_udp: $(BUILD)/drone_sim $(BUILD)/udp_send $(BUILD)/udp_ingest
	@./$(BUILD)/udp_ingest 5005 & INGEST=$$!; \
	  sleep 0.3; \
	  ( ./$(BUILD)/drone_sim & echo $$! > $(BUILD)/.sim.pid ) | \
	    ./$(BUILD)/udp_send 127.0.0.1 5005 & SEND=$$!; \
	  sleep 3; \
	  kill `cat $(BUILD)/.sim.pid` $$SEND $$INGEST 2>/dev/null; \
	  wait 2>/dev/null; rm -f $(BUILD)/.sim.pid; true

clean:
	rm -rf $(BUILD)
