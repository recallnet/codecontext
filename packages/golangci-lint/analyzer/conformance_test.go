package analyzer_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/recallnet/codecontext/packages/golangci-lint/analyzer"
)

type fixtureTag struct {
	Type     string  `json:"type"`
	Subtype  *string `json:"subtype"`
	ID       *string `json:"id"`
	Priority *string `json:"priority"`
	Verified *string `json:"verified"`
	Summary  string  `json:"summary"`
	Line     int     `json:"line"`
}

type fixture struct {
	ID              string            `json:"id"`
	Description     string            `json:"description"`
	Implementations []string          `json:"implementations"`
	FilePath        string            `json:"filePath"`
	Source          string            `json:"source"`
	FilePathByImpl  map[string]string `json:"filePathByImplementation"`
	SourceByImpl    map[string]string `json:"sourceByImplementation"`
	SupportFiles    map[string]string `json:"supportFiles"`
	Expected        struct {
		Tags             []fixtureTag `json:"tags"`
		Errors           []string     `json:"errors"`
		ResolvedCtxFiles []string     `json:"resolvedCtxFiles"`
	} `json:"expected"`
}

func TestSharedConformanceFixtures(t *testing.T) {
	fixturesDir := filepath.Join("..", "..", "conformance-fixtures", "cases")
	entries, err := os.ReadDir(fixturesDir)
	if err != nil {
		t.Fatalf("read fixtures: %v", err)
	}

	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".json" {
			continue
		}

		var fx fixture
		raw, err := os.ReadFile(filepath.Join(fixturesDir, entry.Name()))
		if err != nil {
			t.Fatalf("read fixture %s: %v", entry.Name(), err)
		}
		if err := json.Unmarshal(raw, &fx); err != nil {
			t.Fatalf("parse fixture %s: %v", entry.Name(), err)
		}
		if !slices.Contains(fx.Implementations, "go") {
			continue
		}

		t.Run(fx.ID, func(t *testing.T) {
			root := t.TempDir()
			if err := os.WriteFile(filepath.Join(root, "go.mod"), []byte("module fixture\n\ngo 1.25.0\n"), 0o644); err != nil {
				t.Fatalf("write go.mod: %v", err)
			}

			for relativePath, content := range fx.SupportFiles {
				absPath := filepath.Join(root, filepath.FromSlash(relativePath))
				if err := os.MkdirAll(filepath.Dir(absPath), 0o755); err != nil {
					t.Fatalf("mkdir support dir: %v", err)
				}
				if err := os.WriteFile(absPath, []byte(content), 0o644); err != nil {
					t.Fatalf("write support file: %v", err)
				}
			}

			filePath := fx.FilePath
			if override, ok := fx.FilePathByImpl["go"]; ok {
				filePath = override
			}
			source := fx.Source
			if override, ok := fx.SourceByImpl["go"]; ok {
				source = override
			}

			sourcePath := filepath.Join(root, filepath.FromSlash(filePath))
			if err := os.MkdirAll(filepath.Dir(sourcePath), 0o755); err != nil {
				t.Fatalf("mkdir source dir: %v", err)
			}
			if err := os.WriteFile(sourcePath, []byte(source), 0o644); err != nil {
				t.Fatalf("write source file: %v", err)
			}

			result := analyzer.ParseSource(source, root, filepath.Join("docs", "context"))

			gotTags := make([]fixtureTag, 0, len(result.Tags))
			for _, tag := range result.Tags {
				gotTags = append(gotTags, fixtureTag{
					Type:     tag.Type,
					Subtype:  nullable(tag.Subtype),
					ID:       nullable(tag.ID),
					Priority: nullable(tag.Priority),
					Verified: nullable(tag.Verified),
					Summary:  tag.Summary,
					Line:     tag.Line,
				})
			}

			if !slices.Equal(result.Errors, fx.Expected.Errors) {
				t.Fatalf("errors mismatch\nwant: %#v\ngot:  %#v", fx.Expected.Errors, result.Errors)
			}
			if !equalTags(gotTags, fx.Expected.Tags) {
				t.Fatalf("tags mismatch\nwant: %#v\ngot:  %#v", fx.Expected.Tags, gotTags)
			}
			slices.Sort(result.ResolvedCtxFiles)
			slices.Sort(fx.Expected.ResolvedCtxFiles)
			if !slices.Equal(result.ResolvedCtxFiles, fx.Expected.ResolvedCtxFiles) {
				t.Fatalf("resolved ctx files mismatch\nwant: %#v\ngot:  %#v", fx.Expected.ResolvedCtxFiles, result.ResolvedCtxFiles)
			}
		})
	}
}

func nullable(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func equalTags(left []fixtureTag, right []fixtureTag) bool {
	if len(left) != len(right) {
		return false
	}
	for i := range left {
		if left[i].Type != right[i].Type ||
			left[i].Summary != right[i].Summary ||
			left[i].Line != right[i].Line ||
			deref(left[i].Subtype) != deref(right[i].Subtype) ||
			deref(left[i].ID) != deref(right[i].ID) ||
			deref(left[i].Verified) != deref(right[i].Verified) ||
			deref(left[i].Priority) != deref(right[i].Priority) {
			return false
		}
	}
	return true
}

func deref(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
