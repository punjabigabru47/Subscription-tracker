import pool from "../database/database.js";

export const subscriptionTableSql = `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    frequency VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    payment_method VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

export const createSubscriptionTable = async () => {
  await pool.query(subscriptionTableSql);
};

export default pool;
