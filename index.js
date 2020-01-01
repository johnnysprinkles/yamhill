const LRU = require('lru-cache');

module.exports = {
  memoize(asyncFn, options = {}) {
    let { ttlSeconds = 60, maxItems = 100, keyFn, prefetchSeconds } = options;

    let cache = new LRU({
      max: maxItems,
      maxAge: ttlSeconds * 1000,
    });

    let pendingPromises = {};

    let executeFunction = function(key, args) {
      let promise = asyncFn(...args);

      promise.then(value => {
        cache.set(key, {
          value,
          timestamp: Number(new Date()),
        });
        delete pendingPromises[key];
      });

      promise.catch(() => {
        delete pendingPromises[key];
      });

      pendingPromises[key] = promise;
      return promise;
    };

    return async function(...args) {
      let key = keyFn ? keyFn(args) : 'SINGLETON';
      let wrapper = cache.get(key);

      if (wrapper) {
        let { value, timestamp } = wrapper;
        
        if (prefetchSeconds) {
          let expires = timestamp + (ttlSeconds * 1000);
          let remainingMs = expires - Number(new Date());
          if (remainingMs < prefetchSeconds * 1000) {
            if (!pendingPromises[key]) {
              executeFunction(key, args); // Eagerly prefetch.
            }
          }
        }
        return value;
      }

      return pendingPromises[key] || executeFunction(key, args);
    };
  }
};
