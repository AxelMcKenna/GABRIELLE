CC      ?= cc
CFLAGS  ?= -std=c11 -O2 -Wall -Wextra -Wpedantic -Wshadow -Wconversion
CPPFLAGS = -Iinclude
BUILD   = build

LIB_OBJS = $(BUILD)/locus_frame.o

.PHONY: all test clean

all: $(BUILD)/test_frame

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/locus_frame.o: src/locus_frame.c include/locus_frame.h | $(BUILD)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

$(BUILD)/test_frame.o: test/test_frame.c include/locus_frame.h | $(BUILD)
	$(CC) $(CFLAGS) $(CPPFLAGS) -c $< -o $@

$(BUILD)/test_frame: $(BUILD)/test_frame.o $(LIB_OBJS)
	$(CC) $(CFLAGS) $^ -o $@

test: $(BUILD)/test_frame
	./$(BUILD)/test_frame

clean:
	rm -rf $(BUILD)
