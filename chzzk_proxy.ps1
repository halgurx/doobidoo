try {
    $listener = New-Object System.Net.HttpListener
    # 관리자 권한 문제를 줄이기 위해 127.0.0.1 과 localhost 모두 대응
    $listener.Prefixes.Add("http://localhost:8089/")
    $listener.Start()
    
    Write-Host "====================================================" -ForegroundColor Cyan
    Write-Host " [CHZZK Proxy Server Running on Port 8089]" -ForegroundColor Green
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
                $webClient = New-Object System.Net.WebClient
                $webClient.Encoding = [System.Text.Encoding]::UTF8
                $webClient.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                $json = $webClient.DownloadString($targetUrl)

                $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                Write-Host "[OK] API Fetched Successfully" -ForegroundColor Gray
            } catch {
                $response.StatusCode = 500
                Write-Host "[ERROR] Failed to fetch API: $_" -ForegroundColor Red
            }
        }
        $response.Close()
    }
} catch {
    Write-Host "`n[CRITICAL ERROR] 서버 시작 실패!" -ForegroundColor Red
    Write-Host "오류 내용: $_" -ForegroundColor Yellow
    Write-Host "`n해결 방법: 실행 파일을 우클릭하여 [관리자 권한으로 실행] 해주세요." -ForegroundColor Green
    Read-Host "`n창을 닫으려면 Enter 키를 누르세요..."
}