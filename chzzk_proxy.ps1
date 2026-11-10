$ErrorActionPreference = "Stop"

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:8089/")
    $listener.Start()
    
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host " [OK] CHZZK Proxy Server Running (Port: 8089)" -ForegroundColor Green
    Write-Host " Do NOT close this window while using the roulette." -ForegroundColor Yellow
    Write-Host "====================================================" -ForegroundColor Cyan

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.AppendHeader("Access-Control-Allow-Origin", "*")
        $response.AppendHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
        $response.AppendHeader("Access-Control-Allow-Headers", "*")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $targetUrl = $request.QueryString["url"]
        if ($targetUrl) {
            try {
                [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
                $webClient = New-Object System.Net.WebClient
                $webClient.Encoding = [System.Text.Encoding]::UTF8
                $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                $json = $webClient.DownloadString($targetUrl)

                $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                Write-Host "[200 OK] Fetched Chzzk Data" -ForegroundColor Gray
            } catch {
                $response.StatusCode = 500
                Write-Host "[500 ERR] API Fetch Failed: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
        $response.Close()
    }
} catch {
    Write-Host "`n====================================================" -ForegroundColor Red
    Write-Host " [ERROR] Failed to start Proxy Server!" -ForegroundColor Red
    Write-Host " Reason: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host " -> Please right-click 'run_proxy.bat' and select [Run as Administrator]." -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Red
    Read-Host "`nPress Enter to exit..."
}