const yamhill = require('./index.js');

let sleep = function(duration) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, duration);
  });
};

let sleepThenFail = function(duration) {
  return new Promise((resolve, reject) => {
    setTimeout(reject, duration);
  });
};

let instantAsyncFn = () => sleep(0);
let fastAsyncFn = () => sleep(100);
let slowAsyncFn = () => sleep(2000);

let fastAsyncFnThatFails = () => sleepThenFail(200);

describe('yamhill', () => {

  describe('with all default options', () => {

    test('base test', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn);
      let result = await mem();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('two in serial', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn);
      let result1 = await mem();
      let result2 = await mem();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('two in serial with pause', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn);
      let result1 = await mem();
      await sleep(200);
      let result2 = await mem();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('two in parallel', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn);
      let [ result1, result2 ] = await Promise.all([
        mem(),
        mem(),
      ]);
      expect(fn).toHaveBeenCalledTimes(1);
    });

  });

  describe('with short ttl', () => {
    let options = { ttlSeconds: 0.1 };

    test('two in serial with pause', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn, options);
      let result1 = await mem();
      await sleep(200);
      let result2 = await mem();
      expect(fn).toHaveBeenCalledTimes(2);
    });

  });

  describe('with multiple keys', () => {
    let options = { keyFn: (arg) => arg };

    test('different keys', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn, options);
      let result1 = await mem('aardvark');
      let result2 = await mem('aligator');
      let result3 = await mem('aardvark');
      let result4 = await mem('aligator');
      expect(fn).toHaveBeenCalledTimes(2);
    });

  });

  describe('with cache overflow', () => {
    let options = {
      keyFn: (arg) => arg,
      maxItems: 1,
    };

    test('single item cache', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn, options);
      let result1 = await mem('a');
      let result2 = await mem('b');
      let result3 = await mem('a');
      let result4 = await mem('b');
      expect(fn).toHaveBeenCalledTimes(4);
    });

  });

  describe('prefetch', () => {
    let options = {
      ttlSeconds: 5,
      prefetchSeconds: Infinity,
    };

    test('every item has a prefetch', async () => {
      let fn = jest.fn(fastAsyncFn);
      let mem = yamhill.memoize(fn, options);
      let result1 = await mem();
      let result2 = await mem();
      let result3 = await mem();
      let result4 = await mem();
      // First call takes 200ms, 2nd 3rd and 4th are instant, but
      // the eager preload also happens, total of 2 calls.
      expect(fn).toHaveBeenCalledTimes(2);
    });

  });
});
