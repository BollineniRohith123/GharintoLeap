-- Vendors
CREATE TABLE vendors (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  company_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(50),
  gst_number VARCHAR(20),
  pan_number VARCHAR(10),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  is_verified BOOLEAN DEFAULT FALSE,
  rating DOUBLE PRECISION DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Materials Catalog
CREATE TABLE materials (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES vendors(id),
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT,
  unit VARCHAR(20) NOT NULL,
  price BIGINT NOT NULL,
  discounted_price BIGINT,
  stock_quantity INTEGER DEFAULT 0,
  min_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  images TEXT[], -- JSON array of image URLs
  specifications TEXT, -- JSON specifications
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bill of Materials
CREATE TABLE bom_items (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  material_id BIGINT REFERENCES materials(id),
  quantity DOUBLE PRECISION NOT NULL,
  unit_price BIGINT NOT NULL,
  total_price BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  ordered_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Digital Wallet
CREATE TABLE wallets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) UNIQUE,
  balance BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_spent BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  wallet_id BIGINT REFERENCES wallets(id),
  type VARCHAR(20) NOT NULL, -- credit, debit
  amount BIGINT NOT NULL,
  description TEXT,
  reference_type VARCHAR(50), -- project, lead, commission
  reference_id BIGINT,
  status VARCHAR(20) DEFAULT 'completed',
  payment_method VARCHAR(50),
  gateway_transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Communications
CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES projects(id),
  participants BIGINT[] NOT NULL,
  title VARCHAR(200),
  type VARCHAR(20) DEFAULT 'project', -- project, support, general
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- text, image, file, system
  attachments TEXT[], -- JSON array of file URLs
  is_read BOOLEAN DEFAULT FALSE,
  read_by BIGINT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics Events
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  user_id BIGINT REFERENCES users(id),
  entity_type VARCHAR(50),
  entity_id BIGINT,
  properties TEXT, -- JSON properties
  session_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id BIGINT,
  is_read BOOLEAN DEFAULT FALSE,
  is_push_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_designer_id ON projects(designer_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
