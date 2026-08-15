package tool

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"os/exec"
	"strings"
)

const (
	FPCALC_BIN_PATH = "bin/fpcalc.exe"
	ZHHZ_BIN_PATH   = "bin/zhhz.exe"
)

func TraditionnalToSimplified(TraditionalString string) (string, error) {
	cmd := exec.Command(ZHHZ_BIN_PATH, "-c", "t2s")
	cmd.Stdin = bytes.NewBufferString(TraditionalString)
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("convert failed: %v, input: %s", err, TraditionalString)
	}
	return strings.TrimRight(string(output), "\r\n"), nil
}

func ComputeAcoustIDAndDuration(filePath string) (string, float64, error) {
	// 调用fpcalc.exe计算AcoustID
	cmd := exec.Command(FPCALC_BIN_PATH, "-json", "-ignore-errors", filePath)
	output, err := cmd.Output()
	if err != nil {
		return "", 0, fmt.Errorf("fpcalc failed: %v", err)
	}

	// 解析 JSON 输出
	var fpResult map[string]interface{}
	if err := json.Unmarshal(output, &fpResult); err != nil {
		return "", 0, fmt.Errorf("Unmarshal fpcalc output failed: %v", err)
	}

	// 提取指纹和时长
	fingerprint, ok := fpResult["fingerprint"].(string)
	if !ok || fingerprint == "" {
		return "", 0, fmt.Errorf("fingerprint is empty or not a string")
	}
	duration, ok := fpResult["duration"].(float64)
	if !ok {
		return "", 0, fmt.Errorf("duration is not a float64")
	}

	return fingerprint, duration, nil
}

func ComputeMD5(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := md5.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}

	return fmt.Sprintf("%x", h.Sum(nil)), nil
}

func SaveFile(fileHeader *multipart.FileHeader, filePath string) error {
	src, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}
