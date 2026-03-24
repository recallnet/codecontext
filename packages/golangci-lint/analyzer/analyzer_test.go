package analyzer_test

import (
	"testing"

	"github.com/recallnet/codecontext/packages/golangci-lint/analyzer"
	"golang.org/x/tools/go/analysis/analysistest"
)

func TestAnalyzer(t *testing.T) {
	testdata := analysistest.TestData()
	analysistest.Run(t, testdata, analyzer.Analyzer, "ok", "invalid")
}
