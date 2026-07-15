-- 00033: contracts.assigned_to FK를 profiles → employees로 이전
-- 배경: 760397e에서 담당자 UI가 employees 기준으로 전환됐으나 FK 마이그레이션 누락 (등록 시 FK 위반)
-- 사전 확인: assigned_to NOT NULL인 기존 계약 0건 → 데이터 백필 불필요

ALTER TABLE public.contracts
  DROP CONSTRAINT contracts_assigned_to_fkey;

ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.employees(id);

-- 뷰: assigned_to_name을 profiles → employees에서 조회
CREATE OR REPLACE VIEW public.contracts_with_details WITH (security_invoker = true) AS
 SELECT c.id, c.contract_id, c.client_id, c.type, c.name, c.memo,
    c.total_amount, c.currency, c.stage, c.assigned_to, c.contact_id,
    c.created_at, c.updated_at, c.deleted_at,
    msp.credit_share, msp.expected_mrr, msp.payer, msp.sales_rep_id,
    msp.aws_amount, msp.has_management_fee, msp.billing_method,
    msp.aws_account_ids, msp.aws_am, msp.msp_grade, msp.billing_on,
    cl.name AS client_name,
    cl.client_id AS client_display_id,
    e.name AS assigned_to_name
   FROM public.contracts c
     LEFT JOIN public.contract_msp_details msp ON msp.contract_id = c.id
     LEFT JOIN public.clients cl ON cl.id = c.client_id
     LEFT JOIN public.employees e ON e.id = c.assigned_to
  WHERE c.deleted_at IS NULL;
