$port = 8080
$root = "$PSScriptRoot"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server started at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $root + $request.Url.LocalPath
    if (Test-Path $path -PathType Container) {
        $path = Join-Path $path "index.html"
    }

    if (Test-Path $path -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($path)
        $extension = [System.IO.Path]::GetExtension($path)
        
        $contentType = switch ($extension) {
            ".html" { "text/html" }
            ".css"  { "text/css" }
            ".js"   { "text/javascript" }
            ".png"  { "image/png" }
            ".jpg"  { "image/jpeg" }
            ".md"   { "text/markdown" }
            default { "application/octet-stream" }
        }

        $response.ContentType = $contentType
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
        $response.StatusCode = 200
    } else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}
