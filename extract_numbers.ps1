$folderPath = "C:\Users\Administrator\Desktop\새폴더"
$files = Get-ChildItem -Path $folderPath -Filter "통화 녹음*"
$numbers = @()

foreach ($file in $files) {
    # 파일명에서 전화번호 추출 (숫자로만 된 부분)
    if ($file.Name -match "\d{11}") {
        $number = $matches[0]
        $numbers += $number
    }
}

# 결과를 텍스트 파일로 저장
$numbers | Sort-Object -Unique | Out-File "$folderPath\extracted_numbers.txt"

Write-Host "전화번호 추출이 완료되었습니다. 결과는 extracted_numbers.txt 파일에서 확인할 수 있습니다."
Write-Host "총 $(($numbers | Sort-Object -Unique).Count)개의 고유 번호가 추출되었습니다."
