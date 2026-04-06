-- NXT CRM v2: 인덱스

-- 소프트 삭제 필터용 부분 인덱스
CREATE INDEX idx_clients_active ON clients (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_active ON contracts (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_active ON contacts (id) WHERE deleted_at IS NULL;

-- FK 인덱스
CREATE INDEX idx_clients_parent ON clients (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_contacts_client ON contacts (client_id);
CREATE INDEX idx_contracts_client ON contracts (client_id);
CREATE INDEX idx_contracts_type ON contracts (type);
CREATE INDEX idx_contracts_stage ON contracts (stage);
CREATE INDEX idx_contract_teams_contract ON contract_teams (contract_id);
CREATE INDEX idx_contract_teams_team ON contract_teams (team_id);
CREATE INDEX idx_contract_history_contract ON contract_history (contract_id);
CREATE INDEX idx_education_ops_contract ON education_operations (contract_id);
CREATE INDEX idx_operation_instructors_op ON operation_instructors (operation_id);
CREATE INDEX idx_operation_instructors_ins ON operation_instructors (instructor_id);

-- FTS + pg_trgm 인덱스 (글로벌 검색용)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin (name gin_trgm_ops);
CREATE INDEX idx_contracts_name_trgm ON contracts USING gin (name gin_trgm_ops);
