# Check when OpenAI rate limit resets
# Run with: .\check-rate-limit.ps1

$apiKey = Get-Content .env.local | Select-String "MODERATION_API_KEY=" | ForEach-Object { $_ -replace "MODERATION_API_KEY=", "" }

Write-Host "🔄 Checking OpenAI Moderation API rate limit..." -ForegroundColor Cyan
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $apiKey"
}

$body = @{
    input = "This is a clean test message."
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://api.openai.com/v1/moderations" -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    Write-Host "✅ SUCCESS! Rate limit has reset!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run the full test suite:" -ForegroundColor Yellow
    Write-Host "  node test-moderation.js" -ForegroundColor White
    Write-Host ""
    
    $result = $response.Content | ConvertFrom-Json
    if ($result.results[0].flagged) {
        Write-Host "⚠️  Test content was flagged (unexpected)" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Moderation working correctly (clean content passed)" -ForegroundColor Green
    }
    
} catch {
    if ($_.Exception.Message -match "429") {
        Write-Host "⏳ Still rate limited. Try again in 15-30 minutes." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Rate limits typically reset:" -ForegroundColor Cyan
        Write-Host "  • Free tier: 60/min, 1000/day" -ForegroundColor White
        Write-Host "  • May need to wait up to 1 hour for full reset" -ForegroundColor White
    } else {
        Write-Host "❌ ERROR:" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}
