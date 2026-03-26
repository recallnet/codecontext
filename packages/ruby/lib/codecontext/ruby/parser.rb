# frozen_string_literal: true

require "date"
require "pathname"

module CodeContext
  module Ruby
    NormalizedTag = Struct.new(
      :type,
      :subtype,
      :id,
      :priority,
      :verified,
      :summary,
      :line,
      keyword_init: true
    )

    ParseSourceResult = Struct.new(:tags, :errors, keyword_init: true)

    TAXONOMY = {
      "decision" => %w[tradeoff constraint assumption].freeze,
      "requirement" => [].freeze,
      "risk" => %w[perf security compat].freeze,
      "related" => [].freeze,
      "history" => [].freeze,
      "doc" => [].freeze
    }.freeze

    CONTEXT_PATTERN = %r~\A@context(?:\s+|:)([a-z][a-z0-9]*)(?::([a-z][a-z0-9]*))?\s*
      (?:\{@link\s+([^\s}]+)\})?\s*
      (?:!(critical|high|low))?\s*
      (?:\[verified:(\d{4}-\d{2}-\d{2})\])?\s*
      (?:—|--)\s*(.+)\z~x.freeze
    CONTEXT_PREFIX = /\A@context(?:\s+|:)/.freeze

    module_function

    def parse_source(source, project_root, context_dir: "docs/context", check_refs: true)
      result = ParseSourceResult.new(tags: [], errors: [])
      root = Pathname(project_root)

      source.each_line.with_index(1) do |line, line_number|
        text = strip_comment_delimiters(line).strip
        next unless text.match?(CONTEXT_PREFIX)

        match = CONTEXT_PATTERN.match(text)
        if match.nil?
          result.errors << %(Malformed @context tag: "#{text}")
          next
        end

        context_type, context_subtype, ref, priority, verified, summary = match.captures

        unless TAXONOMY.key?(context_type)
          result.errors << %(Unknown context type: "#{context_type}")
          next
        end

        if context_subtype && !TAXONOMY.fetch(context_type).include?(context_subtype)
          result.errors << %(Invalid subtype "#{context_subtype}" for type "#{context_type}")
          next
        end

        if verified && !valid_verified_date?(verified)
          result.errors << %(Invalid verification date "#{verified}". Expected YYYY-MM-DD.)
          next
        end

        result.tags << NormalizedTag.new(
          type: context_type,
          subtype: context_subtype,
          id: ref,
          priority: priority,
          verified: verified,
          summary: summary.strip,
          line: line_number
        )

        next if ref.nil? || !check_refs
        next if reference_exists?(root, context_dir, ref)

        result.errors << %(Unresolved context reference: "#{ref}")
      end

      result
    end

    def find_project_root(start_dir)
      current = Pathname(start_dir).realpath
      markers = ["Gemfile", "*.gemspec", "pyproject.toml", "package.json", "go.mod", ".git"].freeze

      ([current] + current.ascend.drop(1)).each do |candidate|
        return candidate if markers.any? { |marker| Dir.glob(candidate.join(marker).to_s).any? }
      end

      nil
    rescue Errno::ENOENT
      nil
    end

    def strip_comment_delimiters(line)
      stripped = line.strip
      return stripped.delete_prefix("#").lstrip if stripped.start_with?("#")

      stripped
    end

    def valid_verified_date?(value)
      Date.strptime(value, "%Y-%m-%d").strftime("%Y-%m-%d") == value
    rescue Date::Error
      false
    end

    def reference_exists?(project_root, context_dir, ref)
      return true if ref.start_with?("http://", "https://")

      normalized_ref = ref.delete_prefix("file:")
      candidates = []
      if normalized_ref.include?("/") || normalized_ref.include?(".")
        candidates << project_root.join(normalized_ref)
      else
        candidates << project_root.join(normalized_ref)
        candidates << project_root.join(context_dir, normalized_ref)
      end

      candidates.any?(&:exist?)
    end
  end
end
