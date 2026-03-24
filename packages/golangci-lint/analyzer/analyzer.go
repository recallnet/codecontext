package analyzer

import (
	"go/ast"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"golang.org/x/tools/go/analysis"
)

var (
	contextPattern = regexp.MustCompile(`^@context(?:\s+|:)([a-z][a-z0-9]*)(?::([a-z][a-z0-9]*))?\s*(?:#([A-Za-z0-9_./-]+))?\s*(?:!(critical|high|low))?\s*(?:\[verified:(\d{4}-\d{2}-\d{2})\])?\s*(?:—|--)\s*(.+)$`)
	contextPrefix  = regexp.MustCompile(`^@context(?:\s+|:)`)
)

var taxonomy = map[string]map[string]struct{}{
	"decision": {
		"tradeoff":   {},
		"constraint": {},
		"assumption": {},
	},
	"requirement": {},
	"risk": {
		"perf":     {},
		"security": {},
		"compat":   {},
	},
	"related": {},
	"history": {},
	"doc":     {},
}

var Analyzer = &analysis.Analyzer{
	Name: "codecontext",
	Doc:  "validates @context annotations in Go comments",
	Run:  run,
}

func run(pass *analysis.Pass) (any, error) {
	contextDir := "docs/context"
	checkRefs := true

	if flag := pass.Analyzer.Flags.Lookup("context-dir"); flag != nil && flag.Value.String() != "" {
		contextDir = flag.Value.String()
	}
	if flag := pass.Analyzer.Flags.Lookup("check-refs"); flag != nil {
		checkRefs = flag.Value.String() != "false"
	}

	for _, file := range pass.Files {
		for _, group := range file.Comments {
			checkCommentGroup(pass, file, group, contextDir, checkRefs)
		}
	}

	return nil, nil
}

func init() {
	Analyzer.Flags.String("context-dir", "docs/context", "legacy context directory for bare #refs")
	Analyzer.Flags.Bool("check-refs", true, "check that #refs resolve to local files")
}

func checkCommentGroup(
	pass *analysis.Pass,
	file *ast.File,
	group *ast.CommentGroup,
	contextDir string,
	checkRefs bool,
) {
	filename := pass.Fset.Position(file.Pos()).Filename
	projectRoot := findProjectRoot(filepath.Dir(filename))

	for _, comment := range group.List {
		text := strings.TrimSpace(stripCommentDelimiters(comment.Text))
		if !contextPrefix.MatchString(text) {
			continue
		}

		matches := contextPattern.FindStringSubmatch(text)
		if matches == nil {
			pass.Reportf(comment.Pos(), "malformed @context tag: %q", text)
			continue
		}

		contextType := matches[1]
		contextSubtype := matches[2]
		ref := matches[3]
		verified := matches[5]
		summary := matches[6]

		subtypes, ok := taxonomy[contextType]
		if !ok {
			pass.Reportf(comment.Pos(), "unknown @context type %q", contextType)
			continue
		}
		if contextSubtype != "" {
			if _, valid := subtypes[contextSubtype]; !valid {
				pass.Reportf(comment.Pos(), "invalid @context subtype %q for type %q", contextSubtype, contextType)
				continue
			}
		}
		if strings.TrimSpace(summary) == "" {
			pass.Reportf(comment.Pos(), "empty @context summary")
			continue
		}
		if verified != "" && !isValidVerifiedDate(verified) {
			pass.Reportf(comment.Pos(), "invalid verification date %q", verified)
			continue
		}
		if checkRefs && ref != "" && projectRoot != "" {
			if !referenceExists(projectRoot, contextDir, ref) {
				pass.Reportf(comment.Pos(), "unresolved @context reference %q", ref)
			}
		}
	}
}

func stripCommentDelimiters(line string) string {
	trimmed := strings.TrimSpace(line)
	switch {
	case strings.HasPrefix(trimmed, "//"):
		return strings.TrimSpace(strings.TrimPrefix(trimmed, "//"))
	case strings.HasPrefix(trimmed, "/*"):
		trimmed = strings.TrimPrefix(trimmed, "/*")
		trimmed = strings.TrimSuffix(trimmed, "*/")
		return strings.TrimSpace(trimmed)
	default:
		return trimmed
	}
}

func findProjectRoot(startDir string) string {
	dir := startDir
	for i := 0; i < 10; i++ {
		if pathExists(filepath.Join(dir, "go.mod")) || pathExists(filepath.Join(dir, ".git")) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

func referenceExists(projectRoot string, contextDir string, ref string) bool {
	candidates := []string{}
	if strings.Contains(ref, "/") || strings.Contains(ref, ".") {
		candidates = append(candidates, filepath.Join(projectRoot, filepath.FromSlash(ref)))
	} else {
		candidates = append(candidates,
			filepath.Join(projectRoot, ref),
			filepath.Join(projectRoot, contextDir, ref),
			filepath.Join(projectRoot, contextDir, ref+".ctx.md"),
		)
	}

	for _, candidate := range candidates {
		if pathExists(candidate) {
			return true
		}
	}
	return false
}

func isValidVerifiedDate(value string) bool {
	parsed, err := time.Parse("2006-01-02", value)
	return err == nil && parsed.Format("2006-01-02") == value
}

func pathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
