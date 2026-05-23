CC      ?= cc
CFLAGS  ?= -std=c11 -O2 -Wall -Wextra -Wpedantic -Wshadow -Wconversion
CPPFLAGS = -Iinclude
BUILD   = build

LIB_OBJS = $(BUILD)/locus_frame.o $(BUILD)/locus_stream.o
BINS     = $(BUILD)/weather_sim $(BUILD)/drone_sim \
           $(BUILD)/relay $(BUILD)/test_frame

.PHONY: all test clean run

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

clean:
	rm -rf $(BUILD)
