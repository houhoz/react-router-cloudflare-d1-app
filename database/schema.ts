import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, int } from 'drizzle-orm/sqlite-core';

export const guestBook = sqliteTable('guestBook', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
});

// 创建一个统计每日电费的表
export const dailyElectricityTable = sqliteTable('daily_electricity_table', {
  id: int().primaryKey({ autoIncrement: true }),
  date: text()
    .notNull()
    .default(sql`CURRENT_DATE`),
  electricity: int().notNull(),
  // 和前一日差值
  diff: int().notNull().default(0),
  createdAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text()
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
