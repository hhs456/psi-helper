-- 批次更新排序的 RPC 函數
-- 用於拖曳排序時一次性更新多筆記錄的 sort_order

CREATE OR REPLACE FUNCTION batch_update_sort_order(
  p_table_name TEXT,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item JSONB;
  item_id UUID;
  item_sort_order INTEGER;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    item_id := (item->>'id')::UUID;
    item_sort_order := (item->>'sort_order')::INTEGER;
    
    EXECUTE format(
      'UPDATE %I SET sort_order = $1 WHERE id = $2',
      p_table_name
    )
    USING item_sort_order, item_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION batch_update_sort_order IS '批次更新指定資料表的 sort_order 欄位，用於拖曳排序功能';
