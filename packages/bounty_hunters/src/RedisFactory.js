const IORedis = require("ioredis");
const Redlock = require("redlock");
const consts = require("./../consts");

const getRedisConnectivity = () => {
  const redis = new IORedis(consts.connectionString);
  const redlock = new Redlock([redis], {
    // the expected clock drift; for more details
    // see http://redis.io/topics/distlock
    driftFactor: 0.01, // time in ms

    // the max number of times Redlock will attempt
    // to lock a resource before erroring
    retryCount: 10,

    // the time in ms between attempts
    retryDelay: 200, // time in ms

    // the max time in ms randomly added to retries
    // to improve performance under high contention
    // see https://www.awsarchitectureblog.com/2015/03/backoff.html
    retryJitter: 200 // time in ms
  });

  return {redis, redlock};
};

module.exports = {
  getRedisConnectivity
};
