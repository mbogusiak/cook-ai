-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('recipes', 'recipe_slots')
ORDER BY tablename;
