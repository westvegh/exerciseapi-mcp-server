import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache } from "../src/cache.js";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined for missing keys", () => {
    const cache = new TtlCache(1000);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("returns cached value within TTL", () => {
    const cache = new TtlCache(1000);
    cache.set("key", { value: 42 });
    expect(cache.get("key")).toEqual({ value: 42 });
  });

  it("returns undefined after TTL expires", () => {
    const cache = new TtlCache(1000);
    cache.set("key", { value: 42 });

    vi.advanceTimersByTime(1001);
    expect(cache.get("key")).toBeUndefined();
  });

  it("getStale returns value even after TTL expires", () => {
    const cache = new TtlCache(1000);
    cache.set("key", { value: 42 });

    vi.advanceTimersByTime(5000);
    expect(cache.get("key")).toBeUndefined();
    expect(cache.getStale("key")).toEqual({ value: 42 });
  });

  it("getStale returns undefined for never-set keys", () => {
    const cache = new TtlCache(1000);
    expect(cache.getStale("missing")).toBeUndefined();
  });

  it("overwrites existing entries", () => {
    const cache = new TtlCache(1000);
    cache.set("key", "first");
    cache.set("key", "second");
    expect(cache.get("key")).toBe("second");
  });

  it("uses 1-hour TTL by default", () => {
    const cache = new TtlCache();
    cache.set("key", "value");

    // Just under 1 hour — still fresh
    vi.advanceTimersByTime(59 * 60 * 1000);
    expect(cache.get("key")).toBe("value");

    // Past 1 hour — expired
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(cache.get("key")).toBeUndefined();
  });
});
