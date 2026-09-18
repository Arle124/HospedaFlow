-- Consultas preparadas para sqlc en PostgreSQL

-- name: CreateShift :one
INSERT INTO shifts (
    user_id,
    initial_cash,
    current_cash,
    status,
    started_at,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: GetShiftByID :one
SELECT * FROM shifts
WHERE id = $1 LIMIT 1;

-- name: GetActiveShiftByUserID :one
SELECT * FROM shifts
WHERE user_id = $1 AND status = 'OPEN'
LIMIT 1;

-- name: UpdateShift :one
UPDATE shifts
SET
    current_cash = $2,
    actual_cash = $3,
    difference = $4,
    status = $5,
    notes = $6,
    ended_at = $7,
    updated_at = $8
WHERE id = $1
RETURNING *;
