-- 0002: the business's settings. One row, always id 1.

CREATE TABLE business (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  abn TEXT NOT NULL CHECK (length(abn) = 11 AND abn NOT GLOB '*[^0-9]*'),
  gst_registered INTEGER NOT NULL CHECK (gst_registered IN (0, 1)),
  gst_basis TEXT NOT NULL CHECK (gst_basis IN ('cash', 'accrual')),
  bas_frequency TEXT NOT NULL CHECK (bas_frequency IN ('monthly', 'quarterly')),
  lock_date TEXT CHECK (lock_date IS NULL OR lock_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
