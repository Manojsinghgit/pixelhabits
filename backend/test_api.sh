#!/usr/bin/env bash
# Exercises every endpoint against a locally running server (python manage.py runserver).
# Usage: ./test_api.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
USERNAME="curluser_$$"   # unique per run so repeat runs don't collide on "already taken"
PASSWORD="StrongPass123!"

echo "== Register =="
curl -s -X POST "$BASE_URL/api/auth/register/" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"email\": \"$USERNAME@example.com\", \"password\": \"$PASSWORD\", \"niche\": \"adhd\"}" | jq .

echo "== Login =="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")
echo "$LOGIN_RESPONSE" | jq .
ACCESS=$(echo "$LOGIN_RESPONSE" | jq -r .access)
REFRESH=$(echo "$LOGIN_RESPONSE" | jq -r .refresh)
AUTH_HEADER="Authorization: Bearer $ACCESS"

echo "== Refresh token =="
curl -s -X POST "$BASE_URL/api/auth/refresh/" \
  -H "Content-Type: application/json" \
  -d "{\"refresh\": \"$REFRESH\"}" | jq .

echo "== Create habit =="
HABIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/habits/" \
  -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"name": "Drink water", "icon": "💧", "color": "#00AEEF", "frequency": "daily"}')
echo "$HABIT_RESPONSE" | jq .
HABIT_ID=$(echo "$HABIT_RESPONSE" | jq -r .id)

echo "== Create a custom-days habit =="
curl -s -X POST "$BASE_URL/api/habits/" \
  -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"name": "Gym", "icon": "🏋️", "color": "#FF5733", "frequency": "custom", "custom_days": [0,2,4]}' | jq .

echo "== List habits =="
curl -s "$BASE_URL/api/habits/" -H "$AUTH_HEADER" | jq .

echo "== Get single habit =="
curl -s "$BASE_URL/api/habits/$HABIT_ID/" -H "$AUTH_HEADER" | jq .

echo "== Patch habit (rename) =="
curl -s -X PATCH "$BASE_URL/api/habits/$HABIT_ID/" \
  -H "Content-Type: application/json" -H "$AUTH_HEADER" \
  -d '{"name": "Drink more water"}' | jq .

echo "== Toggle today's log ON =="
curl -s -X POST "$BASE_URL/api/habits/$HABIT_ID/log/" -H "$AUTH_HEADER" | jq .

echo "== Toggle today's log OFF =="
curl -s -X POST "$BASE_URL/api/habits/$HABIT_ID/log/" -H "$AUTH_HEADER" | jq .

echo "== Toggle today's log back ON =="
curl -s -X POST "$BASE_URL/api/habits/$HABIT_ID/log/" -H "$AUTH_HEADER" | jq .

echo "== Get logs (heatmap/calendar range) =="
curl -s "$BASE_URL/api/habits/$HABIT_ID/logs/?start=2026-01-01&end=2026-12-31" -H "$AUTH_HEADER" | jq .

echo "== Weekly summary =="
curl -s "$BASE_URL/api/habits/summary/" -H "$AUTH_HEADER" | jq .

echo "== Unauthenticated request should be rejected (401) =="
curl -s -o /dev/null -w "status: %{http_code}\n" "$BASE_URL/api/habits/"

echo "== Delete habit =="
curl -s -o /dev/null -w "status: %{http_code}\n" -X DELETE "$BASE_URL/api/habits/$HABIT_ID/" -H "$AUTH_HEADER"

echo "All requests completed."
