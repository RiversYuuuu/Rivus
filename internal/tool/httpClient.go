package tool

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

func GetAcoustIDRecordingID(acoustID string, duration float64, apiKey string) (string, error) {
	// 构建请求 URL
	acoustidURL := fmt.Sprintf(
		"https://api.acoustid.org/v2/lookup?client=%s&meta=recordingids&duration=%d&fingerprint=%s",
		apiKey, int(duration), acoustID,
	)

	// 发送请求
	resp, err := http.Get(acoustidURL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Request failed: %s", resp.Status)
	}

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("Get response body failed: %v", err)
	}

	// 解析 JSON 响应
	var acoustidResult map[string]interface{}
	if err := json.Unmarshal(body, &acoustidResult); err != nil {
		return "", fmt.Errorf("Unmarshal JSON failed: %v", err)
	}

	// 检查状态
	if status, ok := acoustidResult["status"].(string); ok && status != "ok" {
		return "", fmt.Errorf("result status error: %v", acoustidResult)
	}

	// 提取结果
	results, ok := acoustidResult["results"].([]interface{})
	if !ok || len(results) == 0 {
		return "", fmt.Errorf("No recording found")
	}

	// 提取第一个结果
	firstResult := results[0].(map[string]interface{})
	recordings, ok := firstResult["recordings"].([]interface{})
	if !ok || len(recordings) == 0 {
		return "", fmt.Errorf("No recording found")
	}

	// 提取第一个录音
	recording := recordings[0].(map[string]interface{})
	recordingid, ok := recording["id"].(string)
	if !ok || recordingid == "" {
		return "", fmt.Errorf("No recording id found, recording: %v", recording)
	}

	return recordingid, nil
}

func GetMusicBrainzRecording(recordingID string) (string, string, string, error) {
	// 构建请求 URL
	musicbrainzURL := fmt.Sprintf(
		"https://musicbrainz.org/ws/2/recording/%s?inc=artists+releases&fmt=json",
		recordingID,
	)

	// 发送请求
	resp, err := http.Get(musicbrainzURL)
	if err != nil {
		return "", "", "", err
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return "", "", "", fmt.Errorf("Request failed: %s", resp.Status)
	}

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", "", fmt.Errorf("Get response body failed: %v", err)
	}

	// 解析 JSON 响应
	var musicBrainzResult map[string]interface{}
	if err := json.Unmarshal(body, &musicBrainzResult); err != nil {
		return "", "", "", fmt.Errorf("Unmarshal JSON failed: %s", err)
	}

	// 提取歌曲信息
	var title, artist, album string

	// 提取歌曲标题
	if audioTitle, ok := musicBrainzResult["title"].(string); ok {
		title, err = TraditionnalToSimplified(audioTitle)
		if err != nil {
			return "", "", "", err
		}
	}

	// 提取艺术家
	if artistCredit, ok := musicBrainzResult["artist-credit"].([]interface{}); ok && len(artistCredit) > 0 {
		if artistObj, ok := artistCredit[0].(map[string]interface{}); ok {
			if name, ok := artistObj["name"].(string); ok {
				artist, err = TraditionnalToSimplified(name)
				if err != nil {
					return "", "", "", err
				}
			}
		}
	}

	// 提取专辑
	if releases, ok := musicBrainzResult["releases"].([]interface{}); ok && len(releases) > 0 {
		release := releases[0].(map[string]interface{})
		if releaseTitle, ok := release["title"].(string); ok {
			album, err = TraditionnalToSimplified(releaseTitle)
			if err != nil {
				return "", "", "", err
			}
		}
	}

	return title, artist, album, nil
}

func GetLyricsFromLRCLIB(artist, track, album string, duration float64) (string, string, error) {
	// 构建请求 URL
	params := url.Values{}
	params.Set("artist_name", artist)
	params.Set("track_name", track)
	if album != "" {
		params.Set("album_name", album)
	}
	if duration > 0 {
		params.Set("duration", fmt.Sprintf("%d", int(duration)))
	}
	lrclibURL := "https://lrclib.net/api/get?" + params.Encode()

	// 发送请求
	resp, err := http.Get(lrclibURL)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()

	// 检查响应状态码
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("Request failed: %s", resp.Status)
	}

	// 读取响应体
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("Get response body failed: %v", err)
	}

	// 解析 JSON 响应
	var lrclibResult map[string]interface{}
	if err := json.Unmarshal(body, &lrclibResult); err != nil {
		return "", "", fmt.Errorf("Unmarshal JSON failed: %v", err)
	}

	// 提取歌词信息
	var syncedLyrics, plainLyrics string

	if synced, ok := lrclibResult["syncedLyrics"].(string); ok {
		syncedLyrics, err = TraditionnalToSimplified(synced)
		if err != nil {
			return "", "", err
		}
	}

	if plain, ok := lrclibResult["plainLyrics"].(string); ok {
		plainLyrics, err = TraditionnalToSimplified(plain)
		if err != nil {
			return "", "", err
		}
	}

	return syncedLyrics, plainLyrics, nil
}
