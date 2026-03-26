# frozen_string_literal: true

require "pathname"
require_relative "parser"

module CodeContext
  module Ruby
    CheckMessage = Struct.new(:file, :line, :message, keyword_init: true)

    module_function

    def check_paths(paths, context_dir: "docs/context", check_refs: true)
      messages = []

      iter_ruby_files(paths).each do |file_path|
        source = file_path.read
        project_root = find_project_root(file_path.dirname) || file_path.dirname
        result = parse_source(source, project_root, context_dir: context_dir, check_refs: check_refs)
        unresolved_lines = result.tags.each_with_object({}) { |tag, acc| acc[tag.id] = tag.line if tag.id }

        result.errors.each do |error|
          line = line_for_error(error, source, result.tags, unresolved_lines)
          messages << CheckMessage.new(file: file_path.to_s, line: line, message: error)
        end
      end

      messages
    end

    def iter_ruby_files(paths)
      files = paths.flat_map do |raw_path|
        path = Pathname(raw_path)
        if path.directory?
          Dir.glob(path.join("**/*.rb").to_s).sort.map { |candidate| Pathname(candidate) }.select(&:file?)
        elsif path.file? && path.extname == ".rb"
          [path]
        else
          []
        end
      end

      files.uniq(&:realpath)
    end

    def line_for_error(error, source, tags, unresolved_lines)
      return unresolved_lines.fetch(error.delete_prefix('Unresolved context reference: "').delete_suffix('"'), 1) if error.start_with?("Unresolved context reference: ")
      return first_context_line(source) if error.start_with?("Malformed @context tag: ")

      tags.first&.line || 1
    end

    def first_context_line(source)
      source.each_line.with_index(1) do |line, line_number|
        return line_number if line.include?("@context")
      end

      1
    end
  end
end
