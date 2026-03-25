package analyzer

import (
	"strings"
)

type NormalizedTag struct {
	Type     string
	Subtype  string
	ID       string
	Priority string
	Verified string
	Summary  string
	Line     int
}

type ParseSourceResult struct {
	Tags   []NormalizedTag
	Errors []string
}

func ParseSource(source string, projectRoot string, contextDir string) ParseSourceResult {
	result := ParseSourceResult{
		Tags:   []NormalizedTag{},
		Errors: []string{},
	}

	lines := strings.Split(source, "\n")
	for i, line := range lines {
		text := strings.TrimSpace(stripCommentDelimiters(line))
		if !contextPrefix.MatchString(text) {
			continue
		}

		matches := contextPattern.FindStringSubmatch(text)
		if matches == nil {
			result.Errors = append(result.Errors, `Malformed @context tag: "`+text+`"`)
			continue
		}

		contextType := matches[1]
		contextSubtype := matches[2]
		ref := matches[3]
		priority := matches[4]
		verified := matches[5]
		summary := matches[6]

		subtypes, ok := taxonomy[contextType]
		if !ok {
			result.Errors = append(result.Errors, `Unknown context type: "`+contextType+`"`)
			continue
		}
		if contextSubtype != "" {
			if _, valid := subtypes[contextSubtype]; !valid {
				result.Errors = append(result.Errors, `Invalid subtype "`+contextSubtype+`" for type "`+contextType+`"`)
				continue
			}
		}
		if verified != "" && !isValidVerifiedDate(verified) {
			result.Errors = append(result.Errors, `Invalid verification date "`+verified+`". Expected YYYY-MM-DD.`)
			continue
		}

		result.Tags = append(result.Tags, NormalizedTag{
			Type:     contextType,
			Subtype:  contextSubtype,
			ID:       ref,
			Priority: priority,
			Verified: verified,
			Summary:  strings.TrimSpace(summary),
			Line:     i + 1,
		})

		if ref == "" {
			continue
		}
		if !referenceExists(projectRoot, contextDir, ref) {
			result.Errors = append(result.Errors, `Unresolved context reference: "`+ref+`"`)
		}
	}

	return result
}
