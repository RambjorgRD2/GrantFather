-- Check current constraints
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'user_roles';

-- Check current function definition
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name LIKE '%organization%';