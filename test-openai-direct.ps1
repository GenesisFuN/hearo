# Direct test of OpenAI Moderation API
# This tests the API key directly without Next.js

$apiKey = Get-Content .env.local | Select-String "MODERATION_API_KEY=" | ForEach-Object { $_ -replace "MODERATION_API_KEY=", "" }

Write-Host "Testing OpenAI Moderation API directly..." -ForegroundColor Cyan
Write-Host "API Key: $($apiKey.Substring(0,20))..." -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $apiKey"
}

$body = @{
    input = "I hate everyone and want to harm them"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://api.openai.com/v1/moderations" -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "✅ SUCCESS! API responded:" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
