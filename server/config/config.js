require('dotenv').config();

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  timezone: '+08:00',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: { ...base }
};
