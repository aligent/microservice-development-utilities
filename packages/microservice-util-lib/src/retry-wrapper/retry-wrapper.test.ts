import retryWrapper from './retry-wrapper.js';

describe('retryWrapper', () => {
  it('returns function\'s result', async () => {
    const result = await retryWrapper(async () => 3, {
      retries: 1
    });
    expect(result).toBe(3);
  });

  it('retries the function the correct amount of times', async () => {
    const fn = jest.fn(async () => {
      throw new Error('Test Error');
    });

    try {
      await retryWrapper(fn, { retries: 3 });
    } catch {
      expect(fn).toHaveBeenCalledTimes(4);
    }
  });

  it('errors if the function returns an error every time', async () => {
    const fn = jest.fn(async () => {
      throw new Error('Test Error');
    });

    try {
      await retryWrapper(fn, { retries: 3 });
    } catch (ex) {
      expect(ex).toBeTruthy();
    }
  });

  it('retries after error', async () => {
    let count = 0;
    const fn = jest.fn(async () => {
      if (count < 2) {
        count++;
        throw new Error('Test Error');
      }
      return true;
    });

    expect(await retryWrapper(fn, { retries: 3 })).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('adds a delay between tries', async () => {
    const fn = jest.fn(async () => {
      throw new Error('Test Error');
    });

    const retries = 3;
    const delay = 300;

    const startTime = Date.now();

    try {
      await retryWrapper(fn, {
        retries,
        delay
      });
      // eslint-disable-next-line no-empty
    } catch {}

    const totalTime = Date.now() - startTime;

    expect(totalTime).toBeGreaterThanOrEqual((retries + 1) * delay);
  });

  it('calls the onRetry function when a retry happens', async () => {
    const onRetry = jest.fn();
    const fn = jest.fn(async () => {
      throw new Error('Test Error');
    });

    try {
      await retryWrapper(fn, {
        retries: 1,
        onRetry
      });
      // eslint-disable-next-line no-empty
    } catch {}

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('accurately counts retries', async () => {
    const onRetry = jest.fn();
    const err = new Error('Test Error');
    const fn = jest.fn(async () => {
      throw err;
    });

    try {
      await retryWrapper(fn, {
        retries: 3,
        onRetry
      });
      // eslint-disable-next-line no-empty
    } catch {}

    expect(onRetry).toHaveBeenLastCalledWith(3, err, {
      retries: 0,
      onRetry,
      delay: 0,
      backoffAmount: 0
    });
  });
});
