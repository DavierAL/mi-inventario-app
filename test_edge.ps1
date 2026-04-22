$uri = "https://xfqyqhpcnyjlkbvkukdz.supabase.co/functions/v1/sync-logistica-sheets"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcXlxaHBjbnlqbGtidmt1a2R6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQzMzE5MSwiZXhwIjoyMDkyMDA5MTkxfQ.-CZVZGarxy9Gqenk2N4dWHDOcYtEGLGHWmy7oYXm6RE"
    "Content-Type" = "application/json"
}
$body = Get-Content "c:\mi-inventario-app\test_payload.json" -Raw

Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
