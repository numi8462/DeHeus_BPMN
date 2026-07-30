-- Schema for the DeHeus BPMN Tool app, inferred from the queries in
-- server/src/controllers/*.js (no schema/migration existed in the repo).
-- Run this once in the Supabase SQL editor before starting the server.

CREATE TABLE "user" (
    id TEXT,
    email TEXT PRIMARY KEY,
    name TEXT,
    department TEXT,
    tenant_id TEXT,
    token_issue_time BIGINT,
    token_expiration_time BIGINT,
    nonce TEXT,
    identity_provider TEXT,
    token_id TEXT,
    resource_id TEXT
);
-- Note: "id" is intentionally NOT unique/primary key. adminController.addNewUser
-- inserts every brand-new user with the literal placeholder id = 'a'; the real
-- Azure AD object id only gets written in on that user's first login
-- (authController.authenticateUser). If two new users are added before either
-- logs in, they would briefly share id = 'a' -- email is the real stable key.

CREATE TABLE project (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    last_update TIMESTAMPTZ
);

CREATE TABLE diagram (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    checkedout_by TEXT
);

CREATE TABLE diagram_relation (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    parent_diagram_id INTEGER REFERENCES diagram(id),
    parent_node_id TEXT,
    child_diagram_id INTEGER NOT NULL REFERENCES diagram(id)
);

CREATE TABLE diagram_checkout (
    id SERIAL PRIMARY KEY,
    diagram_id INTEGER REFERENCES diagram(id),
    user_email TEXT NOT NULL,
    checkout_time TIMESTAMPTZ,
    expiry_time TIMESTAMPTZ,
    status BOOLEAN DEFAULT true
);

-- one draft per diagram: diagram_id is the PK so draftSave's upsert
-- (ON CONFLICT (diagram_id)) works
CREATE TABLE diagram_draft (
    diagram_id INTEGER PRIMARY KEY REFERENCES diagram(id),
    file_data BYTEA,
    file_type TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ
);

CREATE TABLE diagram_published (
    id SERIAL PRIMARY KEY,
    diagram_id INTEGER REFERENCES diagram(id),
    file_data BYTEA,
    file_type TEXT,
    published_by TEXT,
    published_at TIMESTAMPTZ
);

-- one role per (user, project): needed so saveUserData's upsert
-- (ON CONFLICT (user_email, project_id)) works
CREATE TABLE diagram_contribution (
    id SERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    project_id INTEGER REFERENCES project(id),
    editor BOOLEAN DEFAULT false,
    UNIQUE (user_email, project_id)
);

CREATE TABLE node_attachment (
    id SERIAL PRIMARY KEY,
    diagram_id INTEGER REFERENCES diagram(id),
    node_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_data BYTEA,
    file_type TEXT
);

CREATE TABLE user_activity_log (
    id SERIAL PRIMARY KEY,
    diagram_id INTEGER REFERENCES diagram(id),
    user_email TEXT,
    updated_time TIMESTAMPTZ,
    type TEXT
);
