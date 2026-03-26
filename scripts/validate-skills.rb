#!/usr/bin/env ruby
# frozen_string_literal: true

require "yaml"

skill_files = Dir.glob(".agents/skills/**/SKILL.md").sort

if skill_files.empty?
  warn "No SKILL.md files found"
  exit 0
end

errors = []

skill_files.each do |path|
  begin
    content = File.read(path)
    frontmatter = content[/\A---\n(.*?)\n---\n/m, 1]

    if frontmatter.nil?
      errors << "#{path}: missing YAML frontmatter"
      next
    end

    data = YAML.safe_load(frontmatter, permitted_classes: [], aliases: false)
    unless data.is_a?(Hash)
      errors << "#{path}: frontmatter must parse to a mapping"
      next
    end

    %w[name description].each do |field|
      value = data[field]
      if !value.is_a?(String) || value.strip.empty?
        errors << "#{path}: frontmatter field '#{field}' must be a non-empty string"
      end
    end
  rescue Psych::SyntaxError => error
    errors << "#{path}: invalid YAML: #{error.message.lines.first.strip}"
  end
end

if errors.empty?
  puts "SKILL_OK #{skill_files.length} file(s)"
  exit 0
end

warn errors.join("\n")
exit 1
