// File: src/services/presenceService.js
// Description: Manages user presence (online/offline status) using Redis
// Dependencies: ioredis

const redis = require("../config/redis");

const ONLINE_KEY = "online_users"; // Set of online user IDs
const LAST_SEEN_KEY = "user_last_seen"; // Hash: user_id → ISO timestamp

module.exports = {
  async setUserOnline(userId) {
    await redis.sadd(ONLINE_KEY, userId);
    await redis.hdel(LAST_SEEN_KEY, userId); // Clear old last_seen
  },

  async getOnlineUserIds() {
    return await redis.smembers(ONLINE_KEY);
  },

  async setUserOffline(userId) {
    await redis.srem(ONLINE_KEY, userId);
    await redis.hset(LAST_SEEN_KEY, userId, new Date().toISOString());
  },

  async isUserOnline(userId) {
    return redis.sismember(ONLINE_KEY, userId);
  },

  async getLastSeen(userId) {
    return redis.hget(LAST_SEEN_KEY, userId);
  },
};
