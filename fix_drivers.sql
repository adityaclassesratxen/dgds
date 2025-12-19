UPDATE drivers SET is_archived = false WHERE is_archived IS NULL;
UPDATE customers SET is_archived = false WHERE is_archived IS NULL;
UPDATE dispatchers SET is_archived = false WHERE is_archived IS NULL;
