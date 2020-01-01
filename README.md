# yamhill

An async function memoization library that also limits key-specific
concurrency to 1, i.e. if the item is not in the cache _and_ there's an
unsettled promise for it pending, another request for the same key will
simply chain off the existing promise.

## Basic example

```javascript
    import yamhill from 'yamhill';

    let asyncFn = function() {
      return new Promise((resolve, reject) => {
        setTimeout(resolve, 100);
      });
    };

    let memoized = yamhill.memoize(asyncFn);

    ...

    let result = await memoized();
    let result2 = await memoized();
```

## More example

For this example let's imagine you're making axios HTTP calls from an Express
app in Node, and sending server-rendered React. (And also assume you're using
either babel-register or --experimental-modules for ES Module syntax).

Here's how it looks with no memoization:

```javascript
    import axios from 'axios';
    import express from 'express';
    import React from 'react';
    import ReactDOMServer from 'react-dom/server';
    import IndexView from './views/index.js';

    let app = new express();

    app.get('/', async (req, res) => {
      let notifications = await axios.get('/api/notifications');
      let html = ReactDOMServer.renderToStaticMarkup(<IndexView notifications={notifications} />);
      res.send(html);
    });
```

But maybe you're getting 10 requests per second and notifications don't change
all that often. You can memoize them with whatever TTL you like and save the load
on your api server:

```javascript
    import yamhill from 'yamhill';

    ...

    let getNotifications = yamhill.memoize(() => axios.get('/api/notifications'), {
      ttlSeconds: 5,
    });

    app.get('/', async (req, res) => {
      let notifications = await getNotifications();
      let html = ReactDOMServer.renderToStaticMarkup(<IndexView notifications={notifications.data} />);
      res.send(html);
    });
```

Let's further assume that the /api/notifications call is slow, maybe it takes 800ms.
Once it expires out of the cache, at 10 qps you'll see 8 requests come in while you're
waiting for the response to come back. Rather than fire off 8 parallel requests to
/api/nofications, only one is sent all all subsquent requests chain a `then` off of it.
If it ends up rejecting, all the requests waiting on it also reject.

## Options

* `ttlSeconds`: How long the cached value is valid for. Defaults to 60.
* `prefetchSeconds`: If an item in the cache is getting near expiration, you
  can proactively kick off a call for fresh data so the next request might
  already have it ready. Should be a positive number, for example 10 means
  if you fetch a value and it's within 10 seconds of being expired, kick off
  a new call.
* `maxItems`: How many items to keep in the LRU cache. Defaults to 100.
* `keyFn`: A function that takes an array of arguments and returns a string,
  used as the cache key. Defaults to undefined, which is fine for when your
  async function is parameterless.

## Other considerations

1. This library can be useful even with a cache size of 0, just as a concurrency limiter
   that "bundles up" multiple identical async calls.
2. It might be useful to set the `prefetchSeconds` value to `Infinity` in some cases,
   if you're not trying save on resources but rather trying to minimize latency for
   the end user.

## The name

Yamhill is kind of an acronym for **Y**et **A**nother **M**emoization **H**elper something something
**L**ibrary. When you don't know what to name something, take a hint from
Matt Groening and name it after a street in Portland! 
