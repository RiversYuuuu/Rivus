package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"go.senan.xyz/taglib"

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
	if err := repo.DB.Where("duration = 0 OR duration IS NULL").Find(&audios).Error; err != nil {
		log.Fatal(err)
	}

	if len(audios) == 0 {
		fmt.Println("All audio records already have duration")
		return
	}

	fmt.Printf("Found %d records without duration\n", len(audios))

	success, fail := 0, 0
	for i, audio := range audios {
		props, err := taglib.ReadProperties(audio.FilePath)
		if err != nil {
			fmt.Printf("[%d/%d] Failed to read properties: %s, err: %v\n", i+1, len(audios), audio.FilePath, err)
			fail++
			continue
		}

		duration := props.Length.Seconds()
		if err := repo.DB.Model(&model.Audio{}).Where("id = ?", audio.ID).Update("duration", duration).Error; err != nil {
			fmt.Printf("[%d/%d] Failed to update DB: %s, err: %v\n", i+1, len(audios), audio.FilePath, err)
			fail++
			continue
		}

		success++
		fmt.Printf("[%d/%d] Updated: %s -> %.1fs\n", i+1, len(audios), audio.FilePath, duration)
	}

	fmt.Printf("\nDone: %d success, %d failed\n", success, fail)
}
