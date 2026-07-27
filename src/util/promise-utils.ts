/**
 * A custom rate limiter for use during benchmark runs. It increases
 * the pace of requests after two designated thresholds have been reached.
 * Used only by Model when metaInfo.benchmark is true; for fixed rate limiting
 * use withRateLimit from async-combinators instead.
 */
abstract class RateLimiter {
  constructor(protected howManyMilliSeconds: number) {
    this.timer = this.resetTimer();
  }

  private timer: Promise<void>;

  public async next<T>(p: () => Promise<T>): Promise<T> {
    await this.timer;
    this.timer = this.resetTimer();
    return p();
  }

  protected resetTimer = () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, this.howManyMilliSeconds);
    });
}

export class BenchmarkRateLimiter extends RateLimiter {
  private requestCount: number;

  private static INITIAL_PACE = 10000;
  private static PACE_AFTER_150_REQUESTS = 5000;
  private static PACE_AFTER_300_REQUESTS = 2500;

  constructor() {
    console.log(
      `BenchmarkRateLimiter: initial pace is ${BenchmarkRateLimiter.INITIAL_PACE}`
    );
    super(BenchmarkRateLimiter.INITIAL_PACE);
    this.requestCount = 0;
  }

  public next<T>(p: () => Promise<T>): Promise<T> {
    this.requestCount++;
    if (this.requestCount === 150) {
      this.howManyMilliSeconds = BenchmarkRateLimiter.PACE_AFTER_150_REQUESTS;
      console.log(
        `BenchmarkRateLimiter: increasing pace to ${BenchmarkRateLimiter.PACE_AFTER_150_REQUESTS}`
      );
    } else if (this.requestCount === 300) {
      this.howManyMilliSeconds = BenchmarkRateLimiter.PACE_AFTER_300_REQUESTS;
      console.log(
        `BenchmarkRateLimiter: increasing pace to ${BenchmarkRateLimiter.PACE_AFTER_300_REQUESTS}`
      );
    }
    return super.next(p);
  }
}
