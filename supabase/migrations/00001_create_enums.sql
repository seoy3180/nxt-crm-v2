-- NXT CRM v2: ENUM 타입 정의

CREATE TYPE user_role AS ENUM ('staff', 'team_lead', 'admin', 'c_level');
CREATE TYPE team_type AS ENUM ('msp', 'education', 'dev');
CREATE TYPE client_type AS ENUM ('univ', 'corp', 'govt', 'asso', 'etc');
CREATE TYPE client_grade AS ENUM ('A', 'B', 'C', 'D', 'E');
CREATE TYPE business_type AS ENUM ('msp', 'tt', 'dev');
CREATE TYPE contract_type AS ENUM ('msp', 'tt', 'dev');
CREATE TYPE currency_type AS ENUM ('KRW', 'USD');
