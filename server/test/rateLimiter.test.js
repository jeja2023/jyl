const test = require('node:test');
const assert = require('node:assert/strict');
const { createRateLimiter, sweepMemoryStores, memoryStores } = require('../utils/rateLimiter');

/**
 * koa-ratelimit 的内存驱动只在 key 被再次访问时判断过期，从不主动删除，
 * 每个访问过的 IP 都会永久驻留。这里验证清理逻辑确实会回收过期条目。
 */

const findStore = () => {
    // createRateLimiter 会为每个限流器注册一个独立的 Map
    const stores = [...memoryStores];
    return stores[stores.length - 1];
};

test('内存限流会注册可清理的存储', () => {
    const before = memoryStores.size;
    createRateLimiter({ duration: 60000, max: 10, errorMessage: 'too many' });
    assert.equal(memoryStores.size, before + 1, '新建限流器应注册自己的存储');
});

test('清理任务回收过期条目、保留未过期条目', () => {
    createRateLimiter({ duration: 60000, max: 10, errorMessage: 'too many' });
    const store = findStore();

    const nowSeconds = Date.now() / 1000;
    store.set('limit:1.1.1.1', { id: '1.1.1.1', reset: nowSeconds - 60, count: 5, total: 10 });
    store.set('limit:2.2.2.2', { id: '2.2.2.2', reset: nowSeconds + 60, count: 1, total: 10 });
    store.set('limit:3.3.3.3', { id: '3.3.3.3', reset: nowSeconds - 1, count: 9, total: 10 });

    assert.equal(store.size, 3);

    sweepMemoryStores();

    assert.equal(store.size, 1, '过期条目应被回收');
    assert.ok(store.has('limit:2.2.2.2'), '未过期条目必须保留');
});

test('结构异常的条目也会被清掉，不会永久占位', () => {
    createRateLimiter({ duration: 60000, max: 10, errorMessage: 'too many' });
    const store = findStore();

    store.set('limit:bad', { id: 'bad' });
    store.set('limit:null', null);

    sweepMemoryStores();

    assert.equal(store.size, 0);
});
