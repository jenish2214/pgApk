import type {NitroSQLiteConnection} from 'react-native-nitro-sqlite';
import type {SqlExecutor} from '../types';
import {nowISO} from '../utils/dates';
import {rowsOf} from './rows';

const MIGRATIONS = [
  {
    version: 1,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      )`);
      tx.execute(`CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        description TEXT,
        order_date TEXT NOT NULL,
        expected_delivery_date TEXT,
        status TEXT NOT NULL DEFAULT 'Pending'
          CHECK (status IN (
            'Pending',
            'In Preparation',
            'Ready for Collection',
            'Delivered',
            'Cancelled'
          )),
        ready_at TEXT,
        employee_notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`);
      tx.execute(`CREATE TABLE app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`);
      tx.execute(
        'CREATE INDEX idx_customers_name ON customers(name)',
      );
      tx.execute(
        'CREATE INDEX idx_customers_phone ON customers(phone)',
      );
      tx.execute(
        'CREATE INDEX idx_orders_order_number ON orders(order_number)',
      );
      tx.execute('CREATE INDEX idx_orders_status ON orders(status)');
      tx.execute(
        'CREATE INDEX idx_orders_customer_id ON orders(customer_id)',
      );
    },
  },
  {
    version: 2,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kicker TEXT NOT NULL,
        title TEXT NOT NULL,
        action_label TEXT NOT NULL,
        category TEXT NOT NULL,
        image_key TEXT NOT NULL
      )`);
      tx.execute(`CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        metal TEXT NOT NULL,
        price INTEGER NOT NULL,
        badge TEXT,
        category TEXT NOT NULL,
        image_key TEXT NOT NULL,
        description TEXT,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`);
      tx.execute('CREATE INDEX idx_products_category ON products(category)');
      tx.execute(
        `INSERT INTO collections (kicker, title, action_label, category, image_key)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'THE RAJKUMARI EDIT',
          'Modern heirlooms,\nroyally imagined.',
          'Explore collection',
          'Necklaces',
          'hero',
        ],
      );
      [
        [
          'Meher Polki Choker',
          '18K GOLD · POLKI',
          148500,
          'NEW',
          'Necklaces',
          'choker',
          'An antique polki choker finished with pearl drops.',
          1,
        ],
        [
          'Aabha Jhumkas',
          '22K GOLD',
          72800,
          'BESTSELLER',
          'Earrings',
          'jhumkas',
          'Temple jhumkas finished in 22 karat gold.',
          2,
        ],
        [
          'Noor Bangle Pair',
          '22K GOLD',
          96500,
          null,
          'Bangles',
          'bangles',
          'Emerald and pearl bangles meant to be worn together.',
          3,
        ],
        [
          'Heera Ring',
          '18K GOLD',
          42800,
          null,
          'Rings',
          'ring',
          'A slim gold ring with an emerald centre.',
          4,
        ],
      ].forEach(piece => {
        tx.execute(
          `INSERT INTO products (
            name, metal, price, badge, category, image_key, description, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          piece,
        );
      });
      tx.execute(
        `INSERT INTO app_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO NOTHING`,
        ['display_name', 'Ananya'],
      );
    },
  },
  {
    version: 3,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        phone TEXT,
        item_name TEXT NOT NULL,
        note TEXT,
        follow_up_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Waiting'
          CHECK (status IN ('Waiting', 'Bought', 'Closed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )`);
      tx.execute(
        'CREATE INDEX idx_inquiries_status ON inquiries(status)',
      );
      tx.execute(
        'CREATE INDEX idx_inquiries_customer_id ON inquiries(customer_id)',
      );
      tx.execute(
        'CREATE INDEX idx_inquiries_follow_up_date ON inquiries(follow_up_date)',
      );
    },
  },
  {
    version: 4,
    up(tx: SqlExecutor) {
      tx.execute(
        `ALTER TABLE orders ADD COLUMN category TEXT NOT NULL DEFAULT 'Other'`,
      );
      tx.execute(`CREATE TABLE order_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        detail TEXT,
        happened_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )`);
      tx.execute(
        'CREATE INDEX idx_order_events_order_id ON order_events(order_id, happened_at)',
      );
      tx.execute(
        `INSERT INTO order_events (order_id, label, detail, happened_at)
         SELECT id, 'Order placed', item_name || ' · ' || category, created_at
         FROM orders`,
      );
      tx.execute(
        `INSERT INTO order_events (order_id, label, detail, happened_at)
         SELECT id, status, 'Recorded from the shop desk', updated_at
         FROM orders
         WHERE status != 'Pending'`,
      );
    },
  },
  {
    version: 5,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'Other',
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      )`);
      tx.execute('CREATE INDEX idx_order_items_order_id ON order_items(order_id)');
      tx.execute(
        `INSERT INTO order_items (
           order_id, item_name, category, description, created_at, updated_at
         )
         SELECT id, item_name, category, description, created_at, updated_at
         FROM orders`,
      );
    },
  },
  {
    version: 6,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE inquiry_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inquiry_id INTEGER NOT NULL,
        tag_number TEXT NOT NULL,
        item_name TEXT NOT NULL,
        image_uri TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE
      )`);
      tx.execute(
        'CREATE INDEX idx_inquiry_items_inquiry_id ON inquiry_items(inquiry_id)',
      );
      tx.execute(
        `INSERT INTO inquiry_items (
           inquiry_id, tag_number, item_name, image_uri, created_at, updated_at
         )
         SELECT id, printf('%d', 1000 + id), item_name, NULL, created_at, updated_at
         FROM inquiries`,
      );
    },
  },
  {
    version: 7,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        item_name TEXT NOT NULL,
        weight TEXT,
        metal TEXT NOT NULL DEFAULT 'Gold',
        repair_kind TEXT NOT NULL,
        details TEXT,
        received_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Received'
          CHECK (status IN ('Received', 'In repair', 'Ready', 'Returned')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )`);
      tx.execute('CREATE INDEX idx_repairs_customer_id ON repairs(customer_id)');
      tx.execute('CREATE INDEX idx_repairs_status ON repairs(status)');
      tx.execute('CREATE INDEX idx_repairs_received_date ON repairs(received_date)');
    },
  },
  {
    version: 8,
    up(tx: SqlExecutor) {
      tx.execute(`CREATE TABLE repair_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        weight TEXT,
        metal TEXT NOT NULL DEFAULT 'Gold',
        repair_kind TEXT NOT NULL,
        details TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (repair_id) REFERENCES repairs(id) ON DELETE CASCADE
      )`);
      tx.execute('CREATE INDEX idx_repair_items_repair_id ON repair_items(repair_id)');
      tx.execute(
        `INSERT INTO repair_items (
           repair_id, item_name, weight, metal, repair_kind, details, created_at, updated_at
         )
         SELECT id, item_name, weight, metal, repair_kind, details, created_at, updated_at
         FROM repairs`,
      );
    },
  },
  {
    version: 9,
    up(tx: SqlExecutor) {
      tx.execute(
        `ALTER TABLE order_items ADD COLUMN tag_number TEXT NOT NULL DEFAULT ''`,
      );
      tx.execute('ALTER TABLE order_items ADD COLUMN image_uri TEXT');
    },
  },
];

export async function migrate(db: NitroSQLiteConnection) {
  db.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  )`);
  const currentRow = rowsOf(
    db.execute(
      'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
    ),
  )[0];
  let current = Number(currentRow?.version || 0);

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) {
      continue;
    }
    await db.transaction(async tx => {
      migration.up(tx);
      tx.execute(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        [migration.version, nowISO()],
      );
    });
    current = migration.version;
  }
}
