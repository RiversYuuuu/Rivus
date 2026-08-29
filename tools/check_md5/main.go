package main

import (
	"bufio"
	"crypto/md5"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"

	"Rivus/internal/model"
	"Rivus/internal/repository"
)

func main() {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		log.Fatal(err)
	}

	dbPath := filepath.Join(homeDir, ".Rivus", "data.db")
	repo, err := repository.NewRepository(dbPath)
	if err != nil {
		log.Fatal(err)
	}

	var audios []model.Audio
	if err := repo.DB.Find(&audios).Error; err != nil {
		log.Fatal(err)
	}

	fmt.Printf("共 %d 条记录\n\n", len(audios))

	var missing []model.Audio
	var mismatch []model.Audio
	var match int

	for i, audio := range audios {
		actual, err := computeMD5(audio.FilePath)
		if err != nil {
			if os.IsNotExist(err) {
				missing = append(missing, audio)
				fmt.Printf("[%d/%d] ❌ 文件不存在: %s\n", i+1, len(audios), audio.FilePath)
			} else {
				fmt.Printf("[%d/%d] ⚠️  读取失败: %s (%v)\n", i+1, len(audios), audio.FilePath, err)
			}
			continue
		}

		if actual != audio.MD5 {
			mismatch = append(mismatch, audio)
			fmt.Printf("[%d/%d] 🔄 不匹配: %s\n", i+1, len(audios), audio.Title)
			fmt.Printf("         DB:   %s\n", audio.MD5)
			fmt.Printf("         File: %s\n", actual)
		} else {
			match++
		}
	}

	fmt.Println()
	fmt.Println("========== 结果 ==========")
	fmt.Printf("✅ 匹配:     %d\n", match)
	fmt.Printf("🔄 不匹配:   %d\n", len(mismatch))
	fmt.Printf("❌ 文件缺失:  %d\n", len(missing))

	if len(mismatch) > 0 {
		fmt.Println("\n--- MD5 不匹配记录 ---")
		for _, a := range mismatch {
			actual, _ := computeMD5(a.FilePath)
			fmt.Printf("ID=%d  %s\n", a.ID, a.Title)
			fmt.Printf("  路径:   %s\n", a.FilePath)
			fmt.Printf("  DB MD5: %s\n", a.MD5)
			fmt.Printf("  实际:   %s\n", actual)
		}
	}

	if len(missing) > 0 {
		fmt.Println("\n--- 文件缺失记录 ---")
		for _, a := range missing {
			fmt.Printf("ID=%d  %s  路径: %s\n", a.ID, a.Title, a.FilePath)
		}
	}

	fmt.Println()
	fmt.Println("========== 歌名+歌手重复检查 ==========")

	type key struct {
		Title  string
		Artist string
	}
	seen := map[key][]model.Audio{}
	for _, a := range audios {
		k := key{Title: a.Title, Artist: a.Artist}
		seen[k] = append(seen[k], a)
	}

	var dupGroups [][]model.Audio
	for k, group := range seen {
		if len(group) > 1 && k.Title != "" {
			dupGroups = append(dupGroups, group)
		}
	}

	if len(dupGroups) == 0 {
		fmt.Println("✅ 无歌名+歌手重复记录")
	} else {
		fmt.Printf("🔄 发现 %d 组重复\n\n", len(dupGroups))
		for i, group := range dupGroups {
			fmt.Printf("--- 第 %d 组: %s - %s (%d条) ---\n", i+1, group[0].Title, group[0].Artist, len(group))
			for _, a := range group {
				fmt.Printf("  ID=%d  MD5=%s  路径: %s\n", a.ID, a.MD5, a.FilePath)
			}
			fmt.Println()
		}
	}

	fmt.Println()
	fmt.Println("========== 待清理记录 ==========")

	dupIDSet := map[uint]bool{}
	for _, group := range dupGroups {
		for _, a := range group {
			dupIDSet[a.ID] = true
		}
	}

	var toDelete []model.Audio
	for _, a := range mismatch {
		if dupIDSet[a.ID] {
			toDelete = append(toDelete, a)
		}
	}
	for _, a := range missing {
		if dupIDSet[a.ID] {
			toDelete = append(toDelete, a)
		}
	}

	if len(toDelete) == 0 {
		fmt.Println("✅ 无需清理（MD5不匹配且重复的记录为空）")
		return
	}

	fmt.Printf("以下 %d 条记录同时满足「MD5不匹配/文件缺失」且「歌名+歌手重复」，将被删除：\n\n", len(toDelete))
	for _, a := range toDelete {
		fmt.Printf("  ID=%d  %s - %s\n", a.ID, a.Artist, a.Title)
		fmt.Printf("    路径: %s\n", a.FilePath)
	}

	fmt.Printf("\n输入 yes 确认删除: ")
	reader := bufio.NewReader(os.Stdin)
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(strings.ToLower(input))

	if input != "yes" {
		fmt.Println("已取消")
		return
	}

	success, fail := 0, 0
	for i, a := range toDelete {
		if err := repo.DB.Unscoped().Delete(&model.Audio{}, a.ID).Error; err != nil {
			fmt.Printf("[%d/%d] ❌ 删除失败: ID=%d (%v)\n", i+1, len(toDelete), a.ID, err)
			fail++
		} else {
			fmt.Printf("[%d/%d] ✅ 已删除: ID=%d  %s - %s\n", i+1, len(toDelete), a.ID, a.Artist, a.Title)
			success++
		}
	}

	fmt.Printf("\n删除完成: %d 成功, %d 失败\n", success, fail)
}

func computeMD5(filePath string) (string, error) {
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
